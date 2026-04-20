from openai import OpenAI
import os
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SCAFFOLD_STAGES = {
    0: "no_scaffold_yet",
    1: "conceptual_hint",
    2: "partial_information",
    3: "full_guidance"
}

def get_next_stage(current_stage: int, state: SessionState) -> int:
    if current_stage == 0:
        return 1
    if current_stage == 1 and state["user_has_engaged"]:
        return 2
    if current_stage == 2 and state["user_has_engaged"]:
        return 3
    if _user_requested_direct_answer_twice(state):
        return 3
    return current_stage

def _user_requested_direct_answer_twice(state: SessionState) -> bool:
    direct_requests = [
        h for h in state["interaction_history"]
        if h["role"] == "user" and any(
            p in h["content"].lower() for p in [
                "just tell me", "give me the answer",
                "stop asking", "directly", "just answer"
            ]
        )
    ]
    return len(direct_requests) >= 2

def build_prompt(stage: int, user_message: str, state: SessionState) -> tuple:
    domain = state["domain_context"]
    history_text = "\n".join([
        f"{h['role']}: {h['content']}"
        for h in state["interaction_history"][-4:]
    ])

    if stage == 1:
        prompt = (
            f"Domain: {domain}\n"
            f"Recent conversation:\n{history_text}\n\n"
            f"User just asked: {user_message}\n\n"
            "You are a warm and encouraging learning guide. "
            "The user is just getting started so be kind, welcoming and supportive. "
            "Acknowledge their question warmly in one sentence, then ask ONE gentle "
            "Socratic question to understand what they already know. "
            "Keep it friendly and conversational — not clinical or robotic. "
            "Do not answer the question yet. Two sentences maximum total."
            "No bullet points, no headers, no markdown. "
            "Plain conversational English only. "
            "Keep it under 3 sentences."
        )
        mode = "question"

    elif stage == 2:
        prompt = (
            f"Domain: {domain}\n"
            f"Recent conversation:\n{history_text}\n\n"
            f"User just said: {user_message}\n\n"
            "You are a supportive guide and let the user know we are at Stage 2. Acknowledge what the user said positively "
            "if they made any attempt to engage. Then give a conceptual hint — "
            "not the full answer. Point them toward the right way of thinking "
            "in 2-3 sentences. Be encouraging. Do not give the conclusion."
            "No bullet points, no headers, no markdown. "
            "Plain conversational English only. "
            "Keep it under 3 sentences."
        )
        mode = "hint"

    elif stage == 3:
        direct_note = ""
        if _user_requested_direct_answer_twice(state):
            direct_note = (
                "Note: The user has explicitly asked for a direct answer. "
                "Provide it, but add one sentence at the end noting that "
                "reflecting on this yourself will strengthen your understanding."
            )
        prompt = (
            f"Domain: {domain}\n"
            f"Recent conversation:\n{history_text}\n\n"
            f"User just said: {user_message}\n\n"
            f"Provide full guidance now. Be thorough and clear. {direct_note}"
            "No bullet points, no headers, no markdown. "
            "Plain conversational English only. "
            "Keep it under 3 sentences."    
        )
        mode = "full"

    else:
        prompt = (
            f"Domain: {domain}\n"
            f"User just said: {user_message}\n\n"
            "Give partial information to guide thinking. "
            "Share relevant context but leave the conclusion "
            "for the user to reach. 3-4 sentences."
        )
        mode = "partial"

    return prompt, mode

async def run_scaffolding(
    user_message: str,
    state: SessionState
) -> dict:
    current_stage = state["scaffold_stage"]
    next_stage = get_next_stage(current_stage, state)

    prompt, mode = build_prompt(next_stage, user_message, state)

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=350,
        messages=[{"role": "user", "content": prompt}]
    )

    content = resp.choices[0].message.content

    sur_event = {
        "turn": state["turn_count"],
        "stage": next_stage,
        "user_engaged_before_hint": state["user_has_engaged"]
    }
    state["transparency_events"].append(sur_event)

    return {
        "response_mode": mode,
        "content": content,
        "tier": next_stage,
        "stage_name": SCAFFOLD_STAGES.get(next_stage, "unknown"),
        "user_engagement_detected": state["user_has_engaged"],
        "log": {
            "scaffold_event": True,
            "sur_event": sur_event
        }
    }