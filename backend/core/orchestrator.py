# Building the full orchestrator

import anthropic
import os
from core.state import SessionState
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

TURN_TYPES = ["knowledge_seeking", "decision_making", "task_execution", "reflection"]

def classify_turn(user_message: str, history: list) -> str:
    history_text = "\n".join([
        f"{h['role']}: {h['content']}" for h in history[-4:]
    ])
    
    prompt = f"""You are classifying a user message in an academic research writing session.

Conversation so far:
{history_text}

User message: "{user_message}"

Classify this message as exactly one of:
- knowledge_seeking: user wants to understand something
- decision_making: user is choosing between options
- task_execution: user wants something done or produced
- reflection: user is thinking out loud or evaluating

Respond with only the classification label, nothing else."""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=20,
        messages=[{"role": "user", "content": prompt}]
    )
    
    result = response.content[0].text.strip().lower()
    return result if result in TURN_TYPES else "knowledge_seeking"


def detect_engagement(user_message: str) -> bool:
    score = 0
    words = user_message.split()
    
    if len(words) > 12:
        score += 1
    
    reasoning_phrases = [
        "i think", "maybe", "because", "my guess",
        "i believe", "could be", "perhaps", "i feel",
        "it seems", "probably", "i would say"
    ]
    if any(p in user_message.lower() for p in reasoning_phrases):
        score += 1
    
    attempt_phrases = [
        "so the answer", "the gap is", "i think the issue",
        "my understanding", "from what i know", "based on"
    ]
    if any(p in user_message.lower() for p in attempt_phrases):
        score += 1
    
    question_words = ["?", "how", "why", "what", "which", "when", "where"]
    if any(q in user_message.lower() for q in question_words):
        score += 1
    
    return score >= 2


def detect_passive_accept(user_message: str) -> bool:
    msg = user_message.strip().lower()
    passive_phrases = [
        "ok", "okay", "got it", "thanks", "thank you",
        "makes sense", "yes", "sure", "alright", "i see",
        "noted", "understood", "great", "cool", "nice"
    ]
    short_and_passive = len(msg.split()) <= 5 and any(p in msg for p in passive_phrases)
    return short_and_passive


async def run_orchestrator(user_message: str, state: SessionState) -> dict:
    turn_type = classify_turn(user_message, state["interaction_history"])
    state["latest_turn_type"] = turn_type

    engaged = detect_engagement(user_message)
    if engaged:
        state["user_has_engaged"] = True

    if detect_passive_accept(user_message):
        state["rpi_events"].append("passive_accept")
        state["consecutive_passive_accepts"] += 1
    else:
        state["rpi_events"].append("active")
        state["consecutive_passive_accepts"] = 0

    if state["consecutive_passive_accepts"] >= 3:
        state["passivity_alert"] = True
    else:
        state["passivity_alert"] = False

    route = determine_route(turn_type, state)

    response = await execute_route(route, user_message, state)

    state["need_reflection"] = state["turn_count"] % 3 == 0

    return response


def determine_route(turn_type: str, state: SessionState) -> str:
    if state["passivity_alert"]:
        return "challenge"
    
    if turn_type in ["knowledge_seeking", "decision_making"]:
        if not state["user_has_engaged"]:
            return "scaffolding"
        elif state["scaffold_stage"] < 3:
            return "scaffolding"
        else:
            return "direct"
    
    if turn_type == "task_execution":
        return "direct"
    
    if turn_type == "reflection":
        return "reflection"
    
    return "scaffolding"


async def execute_route(route: str, user_message: str, state: SessionState) -> dict:
    from agents.scaffolding import run_scaffolding
    from agents.transparency import run_transparency
    from agents.autonomy import run_autonomy
    from agents.reflection import run_reflection

    main_response = ""
    transparency = None
    challenge = None
    reflection = None

    if route == "challenge":
        challenge = run_autonomy(state)
        main_response = "Let us pause for a moment."

    elif route == "scaffolding":
        scaffold_out = await run_scaffolding(user_message, state)
        main_response = scaffold_out["content"]
        state["scaffold_stage"] = scaffold_out["tier"]

    elif route == "direct":
        resp = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": f"Domain: {state['domain_context']}\n\nUser: {user_message}"
            }]
        )
        main_response = resp.content[0].text

    elif route == "reflection":
        ref_out = run_reflection(state)
        main_response = ref_out["reflection_prompt"]

    transparency = await run_transparency(user_message, main_response)

    if state["need_reflection"] and route != "reflection":
        reflection = run_reflection(state)

    return {
        "main_response": main_response,
        "transparency": transparency,
        "challenge": challenge,
        "reflection": reflection,
        "route_used": route
    }
