# Transparency Agent 

from openai import OpenAI
import os, json
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def run_transparency(
    user_message: str,
    ai_response: str
) -> dict:
    prompt = (
        f'Given this AI response: "{ai_response}"\n\n'
        "Return a JSON object with exactly these three fields:\n"
        "- explanation: one sentence why this response was generated\n"
        "- confidence_band: low, medium, or high\n"
        "- what_to_verify: one thing the user should independently check\n\n"
        "Respond with only valid JSON, no extra text, "
        "no markdown, no backticks."
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {
            "explanation": "Response generated based on session context.",
            "confidence_band": "medium",
            "what_to_verify": "Cross-check with primary sources."
        }