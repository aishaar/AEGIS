import json
import os

def load_results() -> dict:
    path = "evaluation/output/evaluation_results.json"
    if not os.path.exists(path):
        print("No results found. Run run_evaluation.py first.")
        return {}
    with open(path, "r") as f:
        return json.load(f)

def print_detailed_report() -> None:
    results = load_results()
    if not results:
        return

    print("\nAEGIS DETAILED EVALUATION REPORT")
    print("=" * 60)

    for persona_name, data in results.items():
        print(f"\n{persona_name.upper()} PERSONA")
        print("-" * 40)

        print("\nTurn-by-turn breakdown:")
        for turn in data["turn_results"]:
            alert = "ALERT" if turn["passivity_alert"] else "     "
            print(
                f"  Turn {turn['turn']:02d} | {alert} | "
                f"route={turn['route_used']:12} | "
                f"stage={turn['scaffold_stage']} | "
                f"engagement={turn['engagement_level']}"
            )

        metrics = data["final_report"]["metrics"]
        print("\nFinal metrics:")
        print(f"  RPI = {metrics['rpi']} — {'high passivity' if metrics['rpi'] > 0.5 else 'low passivity'}")
        print(f"  SUR = {metrics['sur']} — {'good uptake' if metrics['sur'] > 0.5 else 'low uptake'}")
        print(f"  RAF = {metrics['raf']} — {'good reflection' if metrics['raf'] > 0.5 else 'low reflection'}")
        print(f"  Verdict: {metrics['interpretation']}")

    print("\nComparison table:")
    print(f"{'Persona':<12} {'RPI':>6} {'SUR':>6} {'RAF':>6} {'Engagement':<12}")
    print("-" * 50)
    for persona_name, data in results.items():
        m = data["final_report"]["metrics"]
        print(
            f"{persona_name:<12} "
            f"{m['rpi']:>6} "
            f"{m['sur']:>6} "
            f"{m['raf']:>6} "
            f"{m['engagement_level']:<12}"
        )

if __name__ == "__main__":
    print_detailed_report()