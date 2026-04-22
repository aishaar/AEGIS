# Build session State 

from typing import TypedDict, List

class SessionState(TypedDict):
    session_id: str
    domain_context: str
    user_context: str             # rich user profile: goals, background, knowledge level — populated by teammate's intake flow
    turn_count: int
    user_has_engaged: bool
    scaffold_stage: int
    consecutive_passive_accepts: int
    engagement_score: float       # 0.0 (fully passive) to 1.0 (highly engaged), starts at 0.5
    persona_scores: dict          # cumulative scores for passive / curious / critical
    persona_turn_history: List[dict]
    dominant_persona: str
    overall_persona_score: float
    anchor_question: str          # user's learning goal captured on turn 1, carried through session
    challenge_cooldown: int       # turns remaining where challenge cannot re-fire (counts down each turn)
    last_route: str               # route used on the previous turn — used to detect confused post-challenge responses
    last_engaged_label: str       # label from the previous turn — guards against challenging immediately after genuine engagement
    rpi_events: List[str]
    reflection_events: List[str]
    transparency_events: List[str]
    interaction_history: List[dict]
    latest_turn_type: str
    passivity_alert: bool
    need_reflection: bool

def create_session(
    session_id: str,
    domain_context: str = "academic research writing",
    user_context: str = ""
) -> SessionState:
    return SessionState(
        session_id=session_id,
        domain_context=domain_context,
        user_context=user_context,
        turn_count=0,
        user_has_engaged=False,
        scaffold_stage=0,
        consecutive_passive_accepts=0,
        engagement_score=0.5,
        persona_scores={
            "passive": 0.0,
            "curious": 0.0,
            "critical": 0.0
        },
        persona_turn_history=[],
        dominant_persona="passive",
        overall_persona_score=0.0,
        anchor_question="",
        challenge_cooldown=0,
        last_route="",
        last_engaged_label="",
        rpi_events=[],
        reflection_events=[],
        transparency_events=[],
        interaction_history=[],
        latest_turn_type="",
        passivity_alert=False,
        need_reflection=False
    )