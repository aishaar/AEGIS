# Scaffolding agents

from openai import OpenAI
import os
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def run_scaffolding(
    user_message: str,
    state: SessionState
) -> dict:
    tier = state["scaffold_stage"]

    if tier == 0:
        prompt = (
            f"The user is working on: {user_message}\n"
            f"Domain: {state['domain_context']}\n\n"
            "Ask ONE Socratic question to surface their existing "
            "understanding. Do not answer the question yourself. "
            "One sentence only."
        )
        mode = "question"
        new_tier = 1

    elif tier == 1:
        prompt = (
            f"The user is working on: {user_message}\n"
            f"Domain: {state['domain_context']}\n\n"
            "Give a conceptual hint only — not the full answer. "
            "Point them in the right direction in 2-3 sentences."
        )
        mode = "hint"
        new_tier = 2

    elif tier == 2:
        prompt = (
            f"The user is working on: {user_message}\n"
            f"Domain: {state['domain_context']}\n\n"
            "Give partial information to guide their thinking. "
            "Share relevant context but leave the conclusion "
            "for them to reach. 3-4 sentences."
        )
        mode = "partial"
        new_tier = 3

    else:
        prompt = (
            f"The user is working on: {user_message}\n"
            f"Domain: {state['domain_context']}\n\n"
            "Now provide full guidance. Be thorough and clear."
        )
        mode = "full"
        new_tier = 3

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "response_mode": mode,
        "content": resp.choices[0].message.content,
        "tier": new_tier,
        "user_engagement_detected": state["user_has_engaged"],
        "log": {"scaffold_event": True}
    }
