from openai import OpenAI
import os
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def compute_answer_ratio(engagement_score: float, turn_count: int) -> float:
    """
    How much of the response should be direct answer vs. Socratic guidance.
    engagement_score (0–1) drives 60% of the ratio; turn progression drives 40%.
    Clamped to [0.10, 0.85] so the agent never goes fully silent or fully lecturing.
    """
    turn_factor = min(turn_count, 10) / 10.0
    ratio = engagement_score * 0.6 + turn_factor * 0.4
    return round(max(0.10, min(0.85, ratio)), 2)


def ratio_to_stage(ratio: float) -> int:
    if ratio < 0.35:
        return 1  # exploring — mostly Socratic
    elif ratio < 0.58:
        return 2  # developing — balanced
    else:
        return 3  # consolidated — mostly answer


STAGE_NAMES = {1: "exploring", 2: "developing", 3: "consolidated"}


def build_blended_prompt(
    user_message: str,
    state: SessionState,
    answer_ratio: float
) -> str:
    context_lines = [f"Domain: {state['domain_context']}"]
    if state.get("user_context"):
        context_lines.append(f"User background and goals: {state['user_context']}")
    context_block = "\n".join(context_lines)

    anchor = state.get("anchor_question") or user_message
    history_text = "\n".join([
        f"{h['role']}: {h['content']}"
        for h in state["interaction_history"][-8:]
    ])

    guide_pct = round((1 - answer_ratio) * 100)
    answer_pct = round(answer_ratio * 100)

    if answer_ratio < 0.35:
        blend_instruction = (
            f"The user is still early in their thinking, so lean toward guiding ({guide_pct}% guiding, {answer_pct}% answering). "
            "Acknowledge what they said with warmth. Then ask ONE probing question that helps them reason through the "
            "problem themselves. You may include a very brief directional hint (one sentence) but do not give the answer."
        )
    elif answer_ratio < 0.58:
        blend_instruction = (
            f"The user is engaging — balance guidance and explanation ({guide_pct}% guiding, {answer_pct}% answering). "
            "Acknowledge their thinking positively, then give a concrete partial explanation that meaningfully advances "
            "their understanding. Close with one focused question that nudges them to fill in the remaining gap."
        )
    else:
        blend_instruction = (
            f"The user has been engaging well — lean toward giving a clear, substantive answer ({answer_pct}% answering, {guide_pct}% guiding). "
            "Address their question directly and helpfully. Be thorough but conversational. "
            "At the end, add a brief reflective nudge — invite them to connect this to something they already know "
            "or to verify one specific part of the explanation."
        )

    return (
        f"{context_block}\n\n"
        f"User's core question (keep this in mind throughout): {anchor}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"User just said: {user_message}\n\n"
        f"You are AEGIS, a warm and encouraging learning guide. {blend_instruction}\n\n"
        "No bullet points, no headers, no markdown. "
        "Plain conversational English only. "
        "4 sentences maximum."
    )


async def run_scaffolding(
    user_message: str,
    state: SessionState
) -> dict:
    answer_ratio = compute_answer_ratio(
        state["engagement_score"],
        state["turn_count"]
    )
    stage = ratio_to_stage(answer_ratio)

    prompt = build_blended_prompt(user_message, state, answer_ratio)

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=350,
        messages=[{"role": "user", "content": prompt}]
    )

    content = resp.choices[0].message.content

    sur_event = {
        "turn": state["turn_count"],
        "stage": stage,
        "answer_ratio": answer_ratio,
        "engagement_score": state["engagement_score"],
        "user_engaged_before_hint": state["user_has_engaged"]
    }
    state["transparency_events"].append(sur_event)

    return {
        "response_mode": "blended",
        "content": content,
        "tier": stage,
        "answer_ratio": answer_ratio,
        "stage_name": STAGE_NAMES.get(stage, "exploring"),
        "user_engagement_detected": state["user_has_engaged"],
        "log": {
            "scaffold_event": True,
            "sur_event": sur_event
        }
    }
