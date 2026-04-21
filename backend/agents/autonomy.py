# Autonomy agent

from openai import OpenAI
import os
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CHALLENGE_PROMPTS = [
    "Before I continue — what part of this would you want to verify?",
    "What is your current interpretation in one sentence?",
    "What evidence would make you doubt this conclusion?",
    "Which assumption in my last response would you challenge?",
    "Can you summarize what you understand so far in your own words?"
]

EVENT_LABELS = [
    "passive_accept",
    "informed_agreement",
    "challenge",
    "attempt_reasoning",
    "clarification_request",
    "off_topic"
]

LABEL_DEFINITIONS = """
- passive_accept: The user acknowledges or accepts without showing any thinking. Examples: "ok", "got it", "thanks", "yes", "sure", "makes sense", "noted", or any short reply that adds nothing new.
- informed_agreement: The user agrees but adds context, shares something they know, or connects it to their experience. Example: "That makes sense, I've seen that in my biology class."
- attempt_reasoning: The user tries to reason through something or offers their own explanation or guess. Example: "I think maybe the abstract is important because it gives a summary first?"
- challenge: The user questions, pushes back, or expresses doubt about what was said. Example: "That doesn't match what I read", "Are you sure about that?", "Nope, that didn't help."
- clarification_request: The user asks for more information, a different explanation, or redirects the conversation toward what they actually want. Example: "Can you explain that differently?", "What do you mean by methodology?", "How do I actually read it?"
- off_topic: The user says something completely unrelated to the current learning conversation.
"""

def label_user_turn(user_message: str, state: SessionState) -> str:
    history_text = "\n".join([
        f"{h['role']}: {h['content']}"
        for h in state["interaction_history"][-3:]
    ])

    prompt = (
        f"You are analyzing a user's message in a learning conversation to classify their level of engagement.\n\n"
        f"Recent conversation:\n{history_text}\n\n"
        f"User just said: \"{user_message}\"\n\n"
        f"Classify the user's message as exactly one of these labels:\n{LABEL_DEFINITIONS}\n"
        f"Rules:\n"
        f"- Read the message in context of the conversation above, not in isolation.\n"
        f"- A short 'nope' or 'no' after the AI gave an explanation = challenge, not passive_accept.\n"
        f"- Sharing a personal fact ('I have read no papers') = informed_agreement, not off_topic.\n"
        f"- Asking for resources or suggestions = clarification_request.\n"
        f"- Only use off_topic if the message is genuinely unrelated to the conversation.\n\n"
        f"Respond with only the label, nothing else."
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}]
    )

    result = resp.choices[0].message.content.strip().lower()
    return result if result in EVENT_LABELS else "passive_accept"


def compute_rpi(state: SessionState) -> float:
    events = state["rpi_events"]
    if not events:
        return 0.0
    passive_count = len([e for e in events if e == "passive_accept"])
    return round(passive_count / len(events), 2)


def compute_sur(state: SessionState) -> float:
    sur_events = [
        e for e in state["transparency_events"]
        if isinstance(e, dict) and "user_engaged_before_hint" in e
    ]
    if not sur_events:
        return 0.0
    engaged = len([e for e in sur_events if e["user_engaged_before_hint"]])
    return round(engaged / len(sur_events), 2)


def compute_raf(state: SessionState) -> float | None:
    events = state["reflection_events"]
    if not events:
        return None  # reflection was never shown — not the same as user skipping
    total = len([e for e in events if e in ["engaged", "skipped"]])
    if total == 0:
        return None
    engaged = len([e for e in events if e == "engaged"])
    return round(engaged / total, 2)


def run_autonomy(state: SessionState) -> dict:
    rpi = compute_rpi(state)
    sur = compute_sur(state)
    raf = compute_raf(state)

    idx = state["turn_count"] % len(CHALLENGE_PROMPTS)
    challenge_prompt = CHALLENGE_PROMPTS[idx]

    return {
        "rpi": rpi,
        "sur": sur,
        "raf": raf,
        "consecutive_passive_accepts": state["consecutive_passive_accepts"],
        "trigger_interrupt": True,
        "interrupt_type": "challenge_prompt",
        "prompt": challenge_prompt
    }

SCORE_DELTA = {
    "passive_accept":       -0.20,
    "off_topic":             0.00,
    "informed_agreement":    0.05,
    "clarification_request": 0.10,
    "attempt_reasoning":     0.15,
    "challenge":             0.20,
}

# Score drops below this threshold → passivity alert (only after turn 2 to avoid false positives)
PASSIVITY_THRESHOLD = 0.35

# Labels that count as genuine engagement — don't challenge on the very next turn after these
ENGAGED_LABELS = {"attempt_reasoning", "challenge"}

def update_state_with_label(label: str, state: SessionState) -> None:
    state["rpi_events"].append(label)

    delta = SCORE_DELTA.get(label, 0.0)
    state["engagement_score"] = round(
        max(0.0, min(1.0, state["engagement_score"] + delta)), 2
    )

    if label == "passive_accept":
        state["consecutive_passive_accepts"] += 1
    else:
        state["consecutive_passive_accepts"] = 0

    # Count down cooldown each turn
    if state["challenge_cooldown"] > 0:
        state["challenge_cooldown"] -= 1

    print(f"DEBUG label={label} score={state['engagement_score']} cooldown={state['challenge_cooldown']}")

    # Fix 3: don't fire challenge immediately after a turn where user genuinely engaged
    came_after_engagement = state.get("last_engaged_label", "") in ENGAGED_LABELS

    if (
        state["engagement_score"] < PASSIVITY_THRESHOLD
        and state["turn_count"] > 2
        and state["challenge_cooldown"] == 0
        and not came_after_engagement
    ):
        state["passivity_alert"] = True
    else:
        state["passivity_alert"] = False

    # Track this label so the next turn can check it
    state["last_engaged_label"] = label