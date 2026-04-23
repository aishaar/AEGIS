import requests
import json
import time
import os
import uuid
from personas import PASSIVE_PERSONA, CURIOUS_PERSONA, CRITICAL_PERSONA

BASE_URL = "http://localhost:8000"

EVAL_USERNAME = "eval_user"
EVAL_PASSWORD = "eval_password_123"


def get_auth_token() -> str:
    requests.post(f"{BASE_URL}/register", json={"username": EVAL_USERNAME, "password": EVAL_PASSWORD})

    login_resp = requests.post(f"{BASE_URL}/login", json={"username": EVAL_USERNAME, "password": EVAL_PASSWORD})
    if login_resp.status_code != 200:
        raise RuntimeError(f"Login failed: {login_resp.text}")

    token = login_resp.json()["access_token"]
    print(f"Authenticated as '{EVAL_USERNAME}'")
    return token


def run_persona(persona_name: str, messages: list, token: str) -> dict:
    print(f"\n{'='*50}")
    print(f"Running persona: {persona_name}")
    print(f"{'='*50}")

    headers = {"Authorization": f"Bearer {token}"}
    session_id = str(uuid.uuid4())
    turn_results = []

    for i, message in enumerate(messages):
        payload = {"message": message, "session_id": session_id}

        try:
            response = requests.post(
                f"{BASE_URL}/chat",
                json=payload,
                headers=headers,
                timeout=30
            )
            data = response.json()

            if response.status_code != 200:
                print(f"Error on turn {i+1}: HTTP {response.status_code} — {data}")
                continue

            turn_result = {
                "turn": data["turn"],
                "message": message,
                "route_used": data["response"]["route_used"],
                "scaffold_stage": data["state_snapshot"]["scaffold_stage"],
                "passivity_alert": data["state_snapshot"]["passivity_alert"],
                "rpi_events": data["state_snapshot"]["rpi_events"],
                "engagement_level": data["response"]["ui_hints"]["engagement_level"],
                "scaffold_stage_label": data["response"]["ui_hints"]["scaffold_stage_label"]
            }

            turn_results.append(turn_result)

            print(f"Turn {data['turn']}: route={turn_result['route_used']} | stage={turn_result['scaffold_stage']} | alert={turn_result['passivity_alert']} | engagement={turn_result['engagement_level']}")

            time.sleep(0.5)

        except Exception as e:
            print(f"Error on turn {i+1}: {e}")
            continue

    report_response = requests.get(f"{BASE_URL}/report/{session_id}", headers=headers)
    report = report_response.json()

    return {
        "persona": persona_name,
        "session_id": session_id,
        "turn_results": turn_results,
        "final_report": report
    }


def run_all_personas(token: str) -> dict:
    results = {}

    results["passive"] = run_persona("Passive User", PASSIVE_PERSONA, token)
    time.sleep(2)

    results["active"] = run_persona("Active User", CURIOUS_PERSONA, token)
    time.sleep(2)

    results["mixed"] = run_persona("Mixed User", CRITICAL_PERSONA, token)

    return results


def save_results(results: dict) -> None:
    os.makedirs("evaluation/output", exist_ok=True)
    path = "evaluation/output/evaluation_results.json"
    with open(path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {path}")


def print_summary(results: dict) -> None:
    for persona_name, data in results.items():
        final_report = data["final_report"]
        metrics = final_report.get("metrics", {})
        persona_summary = final_report.get("persona_summary", {})

        print(f"\nFINAL RESULT FOR {persona_name.upper()}")
        print(f"session_id: {data['session_id']}")
        print(f"dominant_persona: {persona_summary.get('dominant_persona', 'N/A')}")
        print(f"final persona_scores: {persona_summary.get('persona_scores', {})}")
        print(f"final overall_persona_score: {persona_summary.get('overall_persona_score', 'N/A')}")
        print()
        print("RPI / SUR / RAF")
        print(f"RPI: {metrics.get('rpi', 'N/A')}")
        print(f"SUR: {metrics.get('sur', 'N/A')}")
        print(f"RAF: {metrics.get('raf', 'N/A')}")


if __name__ == "__main__":
    print("Starting AEGIS evaluation...")
    print("Make sure uvicorn is running at http://localhost:8000")
    print()

    token = get_auth_token()
    results = run_all_personas(token)
    save_results(results)
    print_summary(results)

    print("\nEvaluation complete.")