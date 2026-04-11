from core.state import SessionState

def assemble_response(
    main_response: str,
    transparency: dict,
    challenge: dict,
    reflection: dict,
    route_used: str,
    state: SessionState
) -> dict:

    if challenge and reflection:
        reflection = None

    ui_hints = build_ui_hints(route_used, state)

    return {
        "main_response": main_response,
        "transparency": transparency,
        "challenge": challenge,
        "reflection": reflection,
        "route_used": route_used,
        "ui_hints": ui_hints
    }


def build_ui_hints(route_used: str, state: SessionState) -> dict:
    hints = {
        "show_transparency_panel": True,
        "show_reflection_card": False,
        "show_challenge_banner": False,
        "scaffold_stage_label": get_stage_label(state["scaffold_stage"]),
        "engagement_level": get_engagement_level(state)
    }

    if route_used == "challenge":
        hints["show_challenge_banner"] = True
        hints["show_transparency_panel"] = False
        hints["show_reflection_card"] = False
        return hints

    if route_used == "reflection":
        hints["show_reflection_card"] = True

    if state["need_reflection"] and route_used != "challenge":
        hints["show_reflection_card"] = True

    return hints

def get_stage_label(stage: int) -> str:
    labels = {
        0: "starting",
        1: "exploring",
        2: "developing",
        3: "consolidated"
    }
    return labels.get(stage, "unknown")


def get_engagement_level(state: SessionState) -> str:
    events = state["rpi_events"]
    if not events:
        return "unknown"

    recent = events[-5:]
    passive_count = len([e for e in recent if e == "passive_accept"])
    ratio = passive_count / len(recent)

    if ratio >= 0.6:
        return "low"
    elif ratio >= 0.3:
        return "medium"
    else:
        return "high"