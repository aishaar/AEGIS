# Autonomy agent 

from core.state import SessionState

CHALLENGE_PROMPTS = [
    "Before I continue — what part of this would you want to verify?",
    "What is your current interpretation in one sentence?",
    "What evidence would make you doubt this conclusion?",
    "Which assumption in my last response would you challenge?",
    "Can you summarize what you understand so far in your own words?"
]

def run_autonomy(state: SessionState) -> dict:
    total = max(len(state["rpi_events"]), 1)
    passive_count = len([
        e for e in state["rpi_events"] if e == "passive_accept"
    ])
    rpi = round(passive_count / total, 2)

    idx = state["turn_count"] % len(CHALLENGE_PROMPTS)

    return {
        "rpi": rpi,
        "consecutive_passive_accepts": state["consecutive_passive_accepts"],
        "trigger_interrupt": True,
        "interrupt_type": "challenge_prompt",
        "prompt": CHALLENGE_PROMPTS[idx]
    }
