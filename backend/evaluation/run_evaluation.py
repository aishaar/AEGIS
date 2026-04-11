import requests
import json
import time
import os
from evaluation.personas import PASSIVE_PERSONA, ACTIVE_PERSONA, MIXED_PERSONA

BASE_URL = "http://localhost:8000"

def run_persona(persona_name: str, messages: list) -> dict:
    print(f"\n{'='*50}")
    print(f"Running persona: {persona_name}")
    print(f"{'='*50}")

    session_id = None
    turn_results = []

    for i, message in enumerate(messages):
        payload = {"message": message}
        if session_id:
            payload["session_id"] = session_id

        try:
            response = requests.post(
                f"{BASE_URL}/chat",
                json=payload,
                timeout=30
            )
            data = response.json()

            if not session_id:
                session_id = data["session_id"]

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

    report_response = requests.get(f"{BASE_URL}/report/{session_id}")
    report = report_response.json()

    return {
        "persona": persona_name,
        "session_id": session_id,
        "turn_results": turn_results,
        "final_report": report
    }


def run_all_personas() -> dict:
    results = {}

    results["passive"] = run_persona("Passive User", PASSIVE_PERSONA)
    time.sleep(2)

    results["active"] = run_persona("Active User", ACTIVE_PERSONA)
    time.sleep(2)

    results["mixed"] = run_persona("Mixed User", MIXED_PERSONA)

    return results


def save_results(results: dict) -> None:
    os.makedirs("evaluation/output", exist_ok=True)
    path = "evaluation/output/evaluation_results.json"
    with open(path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {path}")


def print_summary(results: dict) -> None:
    print(f"\n{'='*50}")
    print("EVALUATION SUMMARY")
    print(f"{'='*50}")

    for persona_name, data in results.items():
        metrics = data["final_report"]["metrics"]
        print(f"\n{persona_name.upper()} PERSONA:")
        print(f"  RPI:              {metrics['rpi']}")
        print(f"  SUR:              {metrics['sur']}")
        print(f"  RAF:              {metrics['raf']}")
        print(f"  Engagement:       {metrics['engagement_level']}")
        print(f"  Interpretation:   {metrics['interpretation']}")


if __name__ == "__main__":
    print("Starting AEGIS evaluation...")
    print("Make sure uvicorn is running at http://localhost:8000")
    print()

    results = run_all_personas()
    save_results(results)
    print_summary(results)

    print("\nEvaluation complete.")