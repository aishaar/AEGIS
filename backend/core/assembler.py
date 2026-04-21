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

def compute_metrics(state: dict) -> dict:
    rpi = compute_rpi(state)
    sur = compute_sur(state)
    raf = compute_raf(state)
    engagement = get_engagement_level(state)
    stage = get_stage_label(state["scaffold_stage"])

    return {
        "rpi": rpi,
        "sur": sur,
        "raf": raf,
        "engagement_level": engagement,
        "scaffold_stage_label": stage,
        "turn_count": state["turn_count"],
        "interpretation": interpret_metrics(rpi, sur, raf)
    }


def compute_rpi(state: dict) -> float:
    events = state["rpi_events"]
    if not events:
        return 0.0
    passive = len([e for e in events if e == "passive_accept"])
    return round(passive / len(events), 2)


def compute_sur(state: dict) -> float:
    sur_events = [
        e for e in state["transparency_events"]
        if isinstance(e, dict) and "user_engaged_before_hint" in e
    ]
    if not sur_events:
        return 0.0
    engaged = len([e for e in sur_events if e["user_engaged_before_hint"]])
    return round(engaged / len(sur_events), 2)


def compute_raf(state: dict) -> float | None:
    events = state["reflection_events"]
    if not events:
        return None  # reflection was never shown — not the same as user skipping
    total = len([e for e in events if e in ["engaged", "skipped"]])
    if total == 0:
        return None
    engaged = len([e for e in events if e == "engaged"])
    return round(engaged / total, 2)


def interpret_metrics(rpi: float, sur: float, raf: float | None) -> str:
    if rpi <= 0.2 and sur >= 0.7 and (raf is None or raf >= 0.7):
        return "highly engaged — user is reasoning actively and challenging outputs"
    elif sur >= 0.8 and rpi <= 0.5:
        return "strong scaffolding uptake — user is engaging well with guidance, though some passive moments remain"
    elif rpi <= 0.4 and sur >= 0.5:
        return "moderately engaged — user is thinking but could reflect more deeply"
    elif rpi >= 0.7:
        return "passive reliance detected — user is accepting outputs without reasoning"
    elif sur <= 0.2:
        return "low scaffolding uptake — user is bypassing the reasoning process"
    else:
        return "mixed engagement — improving but passivity patterns present"