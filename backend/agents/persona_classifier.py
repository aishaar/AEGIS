import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv(override=True)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _normalize_scores(passive: float, curious: float, critical: float) -> dict:
    total = passive + curious + critical
    if total == 0:
        return {
            "passive": 0.333,
            "curious": 0.333,
            "critical": 0.334
        }

    return {
        "passive": round(passive / total, 3),
        "curious": round(curious / total, 3),
        "critical": round(critical / total, 3)
    }


def score_persona_rules(user_message: str, state: SessionState) -> dict:
    msg = user_message.strip().lower()
    words = msg.split()

    passive = 0.0
    curious = 0.0
    critical = 0.0

    passive_phrases = [
        "ok", "okay", "got it", "makes sense", "sure", "yes", "alright",
        "i see", "noted", "thanks", "thank you", "done", "ok thanks", "ok great"
    ]

    critical_phrases = [
        "are you sure", "what evidence", "how do you know", "why should",
        "what assumptions", "what part is uncertain", "what is uncertain",
        "i disagree", "that seems wrong", "but", "however", "can you justify",
        "what are the limitations", "how certain"
    ]

    curious_phrases = [
        "what is", "how does", "how is", "what role", "would", "could",
        "can you explain", "tell me more", "what about", "how would"
    ]

    is_short = len(words) <= 4
    has_question = "?" in msg or msg.startswith(
        ("what", "how", "why", "would", "could", "can", "is", "are")
    )

    if any(p in msg for p in passive_phrases):
        passive += 0.8

    if is_short and not has_question:
        passive += 0.3

    if any(p in msg for p in curious_phrases):
        curious += 0.7

    if has_question and not any(p in msg for p in critical_phrases):
        curious += 0.3

    if any(p in msg for p in critical_phrases):
        critical += 0.8

    if has_question and any(
        p in msg for p in ["sure", "evidence", "justify", "uncertain", "limitations"]
    ):
        critical += 0.2

    return _normalize_scores(passive, curious, critical)


def score_persona_llm(user_message: str, state: SessionState) -> dict:
    recent_history = state.get("interaction_history", [])[-6:]

    history_text = []
    for item in recent_history:
        role = item.get("role", "unknown")
        content = item.get("content", "")
        history_text.append(f"{role}: {content}")

    history_block = "\n".join(history_text) if history_text else "No prior conversation history."

    prompt = f"""
You are classifying the user's interaction style for this turn.

Persona definitions:
- passive: the user mainly accepts the AI response, gives minimal follow-up, or moves on without probing
- curious: the user explores related or new ideas, asks broadening questions, and seeks understanding without strongly challenging the AI
- critical: the user probes correctness, certainty, evidence, assumptions, limitations, or challenges parts of the AI response

Use both:
1. the current user message
2. the recent conversation context

Return ONLY valid JSON with this exact schema:
{{
  "passive": float,
  "curious": float,
  "critical": float,
  "reason": "short explanation"
}}

The three scores must sum approximately to 1.0.

Recent conversation:
{history_block}

Current user message:
{user_message}
""".strip()

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "You are a precise behavioral classifier."},
                {"role": "user", "content": prompt}
            ]
        )

        content = response.choices[0].message.content.strip()
        parsed = json.loads(content)

        return {
            "passive": round(float(parsed["passive"]), 3),
            "curious": round(float(parsed["curious"]), 3),
            "critical": round(float(parsed["critical"]), 3),
            "reason": parsed.get("reason", "")
        }

    except Exception as e:
        return {
            "passive": 0.333,
            "curious": 0.333,
            "critical": 0.334,
            "reason": "LLM classification fallback used."
        }
    

def classify_persona_turn(user_message: str, state: SessionState) -> dict:
    rule_scores = score_persona_rules(user_message, state)
    llm_scores = score_persona_llm(user_message, state)

    combined_passive = 0.4 * rule_scores["passive"] + 0.6 * llm_scores["passive"]
    combined_curious = 0.4 * rule_scores["curious"] + 0.6 * llm_scores["curious"]
    combined_critical = 0.4 * rule_scores["critical"] + 0.6 * llm_scores["critical"]

    turn_scores = _normalize_scores(
        combined_passive,
        combined_curious,
        combined_critical
    )

    state["persona_scores"]["passive"] += turn_scores["passive"]
    state["persona_scores"]["curious"] += turn_scores["curious"]
    state["persona_scores"]["critical"] += turn_scores["critical"]

    cumulative_total = sum(state["persona_scores"].values())
    normalized_scores = {
        "passive": round(state["persona_scores"]["passive"] / cumulative_total, 3),
        "curious": round(state["persona_scores"]["curious"] / cumulative_total, 3),
        "critical": round(state["persona_scores"]["critical"] / cumulative_total, 3)
    }

    dominant_persona = max(normalized_scores, key=normalized_scores.get)

    overall_persona_score = round(
        (normalized_scores["curious"] * 0.5) + (normalized_scores["critical"] * 1.0),
        3
    )

    state["dominant_persona"] = dominant_persona
    state["overall_persona_score"] = overall_persona_score
    state["persona_turn_history"].append({
        "turn": state["turn_count"],
        "message": user_message,
        "rule_scores": {
            "passive": rule_scores["passive"],
            "curious": rule_scores["curious"],
            "critical": rule_scores["critical"]
        },
        "llm_scores": {
            "passive": llm_scores["passive"],
            "curious": llm_scores["curious"],
            "critical": llm_scores["critical"]
        },
        "turn_scores": turn_scores,
        "normalized_scores": normalized_scores,
        "dominant_persona": dominant_persona,
        "llm_reason": llm_scores.get("reason", "")
    })

    return {
        "rule_scores": {
            "passive": rule_scores["passive"],
            "curious": rule_scores["curious"],
            "critical": rule_scores["critical"]
        },
        "llm_scores": {
            "passive": llm_scores["passive"],
            "curious": llm_scores["curious"],
            "critical": llm_scores["critical"]
        },
        "turn_scores": turn_scores,
        "normalized_scores": normalized_scores,
        "dominant_persona": dominant_persona,
        "overall_persona_score": overall_persona_score,
        "llm_reason": llm_scores.get("reason", "")
    }