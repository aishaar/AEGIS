from core.state import SessionState

MODE_A_PROMPTS = [
    "Does this match what you already knew about this topic?",
    "Which part of this feels least certain to you?"
]

MODE_B_PROMPTS = [
    "What would you revise in this answer?",
    "What is the main claim you would keep from this response?"
]

MODE_C_PROMPTS = [
    "What assumption here would you challenge first?",
    "How would you defend the opposite conclusion?"
]

def get_reflection_mode(state: SessionState) -> tuple[list, str]:
    turn = state["turn_count"]
    if turn <= 3:
        return MODE_A_PROMPTS, "guided"
    elif turn <= 7:
        return MODE_B_PROMPTS, "active"
    else:
        return MODE_C_PROMPTS, "open"

def should_trigger_reflection(state: SessionState) -> bool:
    if state["turn_count"] % 3 == 0:
        return True
    if state["scaffold_stage"] >= 2:
        return True
    if len(state["rpi_events"]) >= 2:
        last_two = state["rpi_events"][-2:]
        if all(e == "passive_accept" for e in last_two):
            return True
    return False

def run_reflection(state: SessionState) -> dict:
    prompts, style = get_reflection_mode(state)
    prompt = prompts[state["turn_count"] % len(prompts)]
    state["reflection_events"].append("prompted")

    return {
        "reflection_prompt": prompt,
        "reflection_style": style,
        "is_required_this_turn": True
    }

def record_reflection_response(engaged: bool, state: SessionState) -> None:
    if engaged:
        if "prompted" in state["reflection_events"]:
            idx = len(state["reflection_events"]) - 1 - \
                state["reflection_events"][::-1].index("prompted")
            state["reflection_events"][idx] = "engaged"
    else:
        if "prompted" in state["reflection_events"]:
            idx = len(state["reflection_events"]) - 1 - \
                state["reflection_events"][::-1].index("prompted")
            state["reflection_events"][idx] = "skipped"