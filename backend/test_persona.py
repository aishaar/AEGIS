import requests
import json
from evaluation.personas import PASSIVE_PERSONA, CURIOUS_PERSONA, CRITICAL_PERSONA

BASE_URL = "http://127.0.0.1:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlcjQiLCJ1c2VyX2lkIjoiOTNmM2M3ODAtNWYxOS00ODRlLThlZjUtYWE4ODMwZDFmNjAzIiwiZXhwIjoxNzc3MDE0MjYwfQ.NM-PpJy8HE2MWs6P38jsN9dWxSNkJPOG90sHaopP69c"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}"
}


def run_persona(persona_name: str, messages: list) -> None:
    print(f"\n{'=' * 60}")
    print(f"TESTING {persona_name.upper()} PERSONA")
    print(f"{'=' * 60}")

    session_id = None
    last_data = None

    for i, msg in enumerate(messages, start=1):
        payload = {"message": msg}
        if session_id:
            payload["session_id"] = session_id

        response = requests.post(
            f"{BASE_URL}/chat",
            headers=HEADERS,
            json=payload
        )

        try:
            data = response.json()
        except Exception:
            print(f"\nTURN {i} FAILED")
            print("Raw response:", response.text)
            return

        if response.status_code != 200:
            print(f"\nTURN {i} FAILED")
            print(json.dumps(data, indent=2))
            return

        if not session_id:
            session_id = data["session_id"]

        last_data = data
        snapshot = data["state_snapshot"]

        print(f"\nTURN {i}")
        print("message:", msg)
        print("dominant_persona:", snapshot["dominant_persona"])
        print("persona_scores:", snapshot["persona_scores"])
        print("overall_persona_score:", snapshot["overall_persona_score"])

    if not session_id:
        print("No session created.")
        return

    report_response = requests.get(
        f"{BASE_URL}/report/{session_id}",
        headers=HEADERS
    )

    try:
        report = report_response.json()
    except Exception:
        print("Failed to parse report response.")
        print(report_response.text)
        return

    print(f"\nFINAL RESULT FOR {persona_name.upper()}")
    print("session_id:", session_id)

    if last_data:
        snapshot = last_data["state_snapshot"]
        print("dominant_persona:", snapshot["dominant_persona"])
        print("final persona_scores:", snapshot["persona_scores"])
        print("final overall_persona_score:", snapshot["overall_persona_score"])

    if "metrics" in report:
        metrics = report["metrics"]
        print("\nRPI / SUR / RAF")
        print("RPI:", metrics["rpi"])
        print("SUR:", metrics["sur"])
        print("RAF:", metrics["raf"])
        print("engagement_level:", metrics["engagement_level"])
        print("interpretation:", metrics["interpretation"])
    else:
        print("\nReport error:")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    print("Choose a persona to test:")
    print("1 = passive")
    print("2 = curious")
    print("3 = critical")
    print("4 = all")

    choice = input("Enter choice: ").strip()

    if choice == "1":
        run_persona("passive", PASSIVE_PERSONA)
    elif choice == "2":
        run_persona("curious", CURIOUS_PERSONA)
    elif choice == "3":
        run_persona("critical", CRITICAL_PERSONA)
    elif choice == "4":
        run_persona("passive", PASSIVE_PERSONA)
        run_persona("curious", CURIOUS_PERSONA)
        run_persona("critical", CRITICAL_PERSONA)
    else:
        print("Invalid choice.")