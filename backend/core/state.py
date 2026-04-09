# Build session State 

from typing import TypedDict, List

class SessionState(TypedDict):
    session_id: str
    domain_context: str
    turn_count: int
    user_has_engaged: bool
    scaffold_stage: int
    consecutive_passive_accepts: int
    rpi_events: List[str]
    reflection_events: List[str]
    transparency_events: List[str]
    interaction_history: List[dict]
    latest_turn_type: str
    passivity_alert: bool
    need_reflection: bool

def create_session(
    session_id: str,
    domain_context: str = "academic research writing"
) -> SessionState:
    return SessionState(
        session_id=session_id,
        domain_context=domain_context,
        turn_count=0,
        user_has_engaged=False,
        scaffold_stage=0,
        consecutive_passive_accepts=0,
        rpi_events=[],
        reflection_events=[],
        transparency_events=[],
        interaction_history=[],
        latest_turn_type="",
        passivity_alert=False,
        need_reflection=False
    )