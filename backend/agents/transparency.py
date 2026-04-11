# Transparency Agent 

from openai import OpenAI
import os, json
from dotenv import load_dotenv
from core.state import SessionState

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

UNCERTAINTY_PHRASES = [
    "i think", "possibly", "might", "could be",
    "not certain", "unclear", "may", "perhaps",
    "i believe", "roughly", "approximately", "likely"
]

PATTERN_PHRASES = [
    "generally", "typically", "usually", "often",
    "in most cases", "commonly", "tends to"
]

def detect_uncertainty(ai_response: str) -> bool:
    response_lower = ai_response.lower()
    return any(p in response_lower for p in UNCERTAINTY_PHRASES)

def detect_basis_type(ai_response: str) -> str:
    response_lower = ai_response.lower()
    has_pattern = any(p in response_lower for p in PATTERN_PHRASES)
    has_specific = any(p in response_lower for p in [
        "according to", "research shows", "studies show",
        "evidence", "specifically", "for example", "such as"
    ])
    if has_specific and has_pattern:
        return "mixed"
    elif has_specific:
        return "grounded"
    else:
        return "pattern_completion"

def detect_confidence_band(ai_response: str, basis_type: str) -> str:
    uncertainty_count = sum(
        1 for p in UNCERTAINTY_PHRASES
        if p in ai_response.lower()
    )
    if uncertainty_count >= 2 or basis_type == "pattern_completion":
        return "low"
    elif uncertainty_count == 1 or basis_type == "mixed":
        return "medium"
    else:
        return "high"

async def run_transparency(
    user_message: str,
    ai_response: str,
    state: SessionState = None
) -> dict:
    uncertainty_flag = detect_uncertainty(ai_response)
    basis_type = detect_basis_type(ai_response)
    confidence_band = detect_confidence_band(ai_response, basis_type)

    domain = state["domain_context"] if state else "academic research writing"

    prompt = (
        f"Domain: {domain}\n"
        f"User asked: {user_message}\n"
        f"AI responded: {ai_response}\n\n"
        "Generate a transparency note with exactly these three fields:\n"
        "- explanation: one sentence explaining why this response "
        "was generated this way\n"
        "- what_to_verify: one specific thing the user should "
        "independently verify before accepting this\n\n"
        "Respond with only valid JSON. No markdown, no backticks, "
        "no extra text."
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = resp.choices[0].message.content.strip()
        parsed = json.loads(raw)

        return {
            "explanation": parsed.get(
                "explanation",
                "Response generated based on session context."
            ),
            "uncertainty_flag": uncertainty_flag,
            "basis_type": basis_type,
            "confidence_band": confidence_band,
            "what_to_verify": parsed.get(
                "what_to_verify",
                "Cross-check with primary sources."
            )
        }

    except Exception:
        return {
            "explanation": "Response generated based on session context and domain knowledge.",
            "uncertainty_flag": uncertainty_flag,
            "basis_type": basis_type,
            "confidence_band": confidence_band,
            "what_to_verify": "Cross-check key claims with primary academic sources."
        }