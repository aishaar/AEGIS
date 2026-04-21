from openai import OpenAI
import os
from core.state import SessionState
from dotenv import load_dotenv
# from agents.reflection import should_trigger_reflection, record_reflection_response  # reflection disabled
from core.assembler import assemble_response

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TURN_TYPES = [
    "knowledge_seeking",
    "decision_making",
    "task_execution",
    "reflection"
]

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

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=20,
        messages=[{"role": "user", "content": prompt}]
    )

    result = response.choices[0].message.content.strip().lower()
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


# Labels from the autonomy agent that indicate the user is actively engaging
ENGAGED_LABELS = {"challenge", "attempt_reasoning", "clarification_request"}

# Turns to lock out re-firing after a challenge is shown
CHALLENGE_COOLDOWN_TURNS = 3

# Short greetings that should not be stored as the anchor question
GREETING_PHRASES = {"hello", "hi", "hey", "hiya", "howdy", "greetings", "good morning", "good evening", "good afternoon"}

def _is_greeting(message: str) -> bool:
    return message.strip().lower() in GREETING_PHRASES or len(message.split()) <= 2

def _build_context_block(state: SessionState) -> str:
    """Returns a context string for LLM prompts — includes user_context when available."""
    lines = [f"Domain: {state['domain_context']}"]
    if state.get("user_context"):
        lines.append(f"User background and goals: {state['user_context']}")
    return "\n".join(lines)

async def run_orchestrator(user_message: str, state: SessionState) -> dict:
    from agents.autonomy import label_user_turn, update_state_with_label

    # Fix 1 — capture anchor on turn 1 only if it's a real learning goal, not a greeting
    if state["turn_count"] == 1 and not state["anchor_question"] and not _is_greeting(user_message):
        state["anchor_question"] = user_message

    # Fix 1 — skip labeling on turn 1: no prior context exists and opening statements are mislabeled
    if state["turn_count"] == 1:
        label = "informed_agreement"  # neutral default — don't penalize the opening turn
    else:
        label = label_user_turn(user_message, state)

    update_state_with_label(label, state)

    # Wire autonomy labels directly into user_has_engaged
    if label in ENGAGED_LABELS:
        state["user_has_engaged"] = True

    print(f"DEBUG label={label} score={state['engagement_score']} alert={state['passivity_alert']}")

    # Fix 2 — detect confused post-challenge response using last_route instead of passivity_alert
    # (passivity_alert is already reset by update_state_with_label when cooldown > 0)
    if state["last_route"] == "challenge" and label == "clarification_request":
        state["latest_turn_type"] = "knowledge_seeking"
        response = await execute_route("explain_challenge", user_message, state)
        state["last_route"] = "explain_challenge"
        state["need_reflection"] = False
        return response

    if state["passivity_alert"]:
        state["latest_turn_type"] = "passive"
        state["challenge_cooldown"] = CHALLENGE_COOLDOWN_TURNS
        response = await execute_route("challenge", user_message, state)
        state["last_route"] = "challenge"
        state["need_reflection"] = False
        return response

    turn_type = classify_turn(
        user_message,
        state["interaction_history"]
    )

    # Change 5 — autonomy label is more context-aware; let it override the turn classifier when relevant
    if label == "clarification_request" and turn_type not in ("knowledge_seeking", "decision_making"):
        turn_type = "knowledge_seeking"

    state["latest_turn_type"] = turn_type

    # keep the heuristic as a fallback for engagement detection
    if detect_engagement(user_message):
        state["user_has_engaged"] = True

    # Change 1 — if anchor still empty after turn 1, set it on first real knowledge turn
    if (
        not state["anchor_question"]
        and turn_type in ["knowledge_seeking", "decision_making"]
        and not _is_greeting(user_message)
    ):
        state["anchor_question"] = user_message

    route = determine_route(turn_type, state)
    response = await execute_route(route, user_message, state)
    state["last_route"] = route
    state["need_reflection"] = False  # reflection disabled — circle back later

    return response


def determine_route(turn_type: str, state: SessionState) -> str:
    if state["turn_count"] == 1:
        return "welcome"

    if state["passivity_alert"]:
        return "challenge"

    # task_execution: user wants something produced — answer directly
    if turn_type == "task_execution":
        return "direct"

    # reflection disabled — route reflection turns through scaffolding for now
    # if turn_type == "reflection":
    #     return "reflection"

    # knowledge_seeking / decision_making: always go through scaffolding
    # The scaffolding agent uses engagement_score to blend Socratic vs. direct answer
    # — no hard switch needed here
    return "scaffolding"


async def execute_route(
    route: str,
    user_message: str,
    state: SessionState
) -> dict:
    from agents.scaffolding import run_scaffolding
    from agents.transparency import run_transparency
    from agents.autonomy import run_autonomy
    # from agents.reflection import run_reflection  # reflection disabled

    main_response = ""
    transparency = None
    challenge = None
    reflection = None

    if route == "welcome":
        context_block = _build_context_block(state)
        if state.get("user_context"):
            # Context known — acknowledge it and dive straight into guiding
            welcome_instruction = (
                "You are AEGIS, a warm and encouraging AI learning guide. "
                "You already have background on who this user is and what they want to learn — acknowledge it briefly and warmly. "
                "Let them know you will guide their thinking rather than just hand them answers. "
                "Then ask ONE focused opening question that connects directly to their stated goal. "
                "Do NOT ask them to repeat what they want to learn — you already know. "
                "3 sentences maximum. Plain conversational English, no markdown."
            )
        else:
            # No context yet — ask what they want to learn
            welcome_instruction = (
                "You are AEGIS, a warm and encouraging AI learning guide. "
                "Welcome the user kindly and let them know you will guide their thinking rather than just give answers. "
                "Then ask them one gentle opening question: what do they want to learn, and what do they already know about it? "
                "3 sentences maximum. Plain conversational English, no markdown."
            )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=150,
            messages=[{"role": "user", "content": (
                f"{context_block}\n"
                f"User said: {user_message}\n\n"
                f"{welcome_instruction}"
            )}]
        )
        main_response = resp.choices[0].message.content

    elif route == "challenge":
        challenge = run_autonomy(state)
        main_response = challenge["prompt"]

    elif route == "explain_challenge":
        context_block = _build_context_block(state)
        history_text = "\n".join([
            f"{h['role']}: {h['content']}"
            for h in state["interaction_history"][-4:]
        ])
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=150,
            messages=[{"role": "user", "content": (
                f"{context_block}\n\n"
                f"Conversation so far:\n{history_text}\n\n"
                f"User just said: \"{user_message}\"\n\n"
                "You are AEGIS. You just asked the user a challenge question to encourage them to think "
                "independently, but they seem confused about why. Briefly and warmly explain that you "
                "asked that question to help them build their own understanding — not to trick them. "
                "Then gently re-invite them to share their thoughts on the topic. "
                "2-3 sentences. Plain conversational English, no markdown."
            )}]
        )
        main_response = resp.choices[0].message.content

    elif route == "scaffolding":
        scaffold_out = await run_scaffolding(user_message, state)
        main_response = scaffold_out["content"]
        state["scaffold_stage"] = scaffold_out["tier"]

    elif route == "direct":
        context_block = _build_context_block(state)
        history_text = "\n".join([
            f"{h['role']}: {h['content']}"
            for h in state["interaction_history"][-6:]
        ])
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    f"{context_block}\n\n"
                    f"Conversation so far:\n{history_text}\n\n"
                    f"User just said: {user_message}\n\n"
                    "Answer their actual question clearly and helpfully. "
                    "Use what you know about them to personalize your answer. "
                    "Be concrete and practical — give them real actionable knowledge. "
                    "No bullet points, no headers, no markdown. "
                    "Plain conversational English. "
                    "3 to 4 sentences maximum."
                )
            }]
        )
        main_response = resp.choices[0].message.content

    # elif route == "reflection":  # reflection disabled
    #     ref_out = run_reflection(state)
    #     main_response = ref_out["reflection_prompt"]
    #     reflection = ref_out

    transparency = await run_transparency(user_message, main_response, state)

    # if state["need_reflection"] and route != "reflection":  # reflection disabled
    #     reflection = run_reflection(state)

    return assemble_response(
        main_response=main_response,
        transparency=transparency,
        challenge=challenge,
        reflection=reflection,
        route_used=route,
        state=state
    )