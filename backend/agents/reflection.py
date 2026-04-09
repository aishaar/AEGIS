# Reflection Agent 

from core.state import SessionState

MODE_A = [
    "Does this match what you already knew about this topic?",
    "Which part of this feels least certain to you?"
]
MODE_B = [
    "What would you revise in this answer?",
    "What is the main claim you would keep from this response?"
]
MODE_C = [
    "What assumption here would you challenge first?",
    "How would you defend the opposite conclusion?"
]

def run_reflection(state: SessionState) -> dict:
    turn = state["turn_count"]

    if turn <= 3:
        prompts, style = MODE_A, "guided"
    elif turn <= 7:
        prompts, style = MODE_B, "active"
    else:
        prompts, style = MODE_C, "open"

    prompt = prompts[turn % len(prompts)]
    state["reflection_events"].append("prompted")

    return {
        "reflection_prompt": prompt,
        "reflection_style": style,
        "is_required_this_turn": True
    }