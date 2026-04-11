# Autonomy agent 

from core.state import SessionState

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

def label_user_turn(user_message: str, state: SessionState) -> str:
    msg = user_message.strip().lower()
    words = msg.split()

    passive_phrases = [
        "ok", "okay", "got it", "thanks", "thank you",
        "makes sense", "yes", "sure", "alright", "i see",
        "noted", "understood", "great", "cool", "nice",
        "sounds good", "perfect", "got it thanks"
    ]
    challenge_phrases = [
        "but", "however", "i disagree", "not sure",
        "that doesn't", "wait", "actually", "i doubt",
        "are you sure", "why would", "that seems wrong",
        "i don't think", "that's not"
    ]
    reasoning_phrases = [
        "i think", "maybe", "because", "my guess",
        "i believe", "could be", "perhaps",
        "it seems", "probably", "i would say",
        "so the answer", "my understanding", "based on"
    ]
    question_indicators = ["?", "how", "why", "what", "which", "when", "where"]

    is_short = len(words) <= 5
    is_passive = any(p in msg for p in passive_phrases)
    has_challenge = any(p in msg for p in challenge_phrases)
    has_reasoning = any(p in msg for p in reasoning_phrases)
    has_question = any(q in msg for q in question_indicators)
    is_long = len(words) > 12

    if has_challenge:
        return "challenge"

    if has_reasoning and is_long:
        return "attempt_reasoning"

    if has_question and not is_short:
        return "clarification_request"

    if is_short and is_passive:
        return "passive_accept"

    if has_reasoning and not is_short:
        return "informed_agreement"

    return "off_topic"


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


def compute_raf(state: SessionState) -> float:
    events = state["reflection_events"]
    if not events:
        return 0.0
    engaged = len([e for e in events if e == "engaged"])
    total = len([e for e in events if e in ["engaged", "skipped", "prompted"]])
    if total == 0:
        return 0.0
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

def update_state_with_label(label: str, state: SessionState) -> None:
    state["rpi_events"].append(label)

    if label == "passive_accept":
        state["consecutive_passive_accepts"] += 1
    else:
        state["consecutive_passive_accepts"] = 0

    print(f"DEBUG label={label} consecutive={state['consecutive_passive_accepts']} alert={state['passivity_alert']}")

    if state["consecutive_passive_accepts"] >= 3:
        state["passivity_alert"] = True
    else:
        state["passivity_alert"] = False