# Build the FastAPI Endpoint

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.state import create_session, SessionState
from core.orchestrator import run_orchestrator
import json, os, uuid
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, SessionState] = {}

class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    domain_context: str = "academic research writing"

@app.post("/chat")
async def chat(req: ChatRequest):
    sid = req.session_id or str(uuid.uuid4())

    if sid not in sessions:
        sessions[sid] = create_session(sid, req.domain_context)

    state = sessions[sid]
    state["turn_count"] += 1
    state["interaction_history"].append({
        "role": "user",
        "content": req.message,
        "turn": state["turn_count"]
    })

    response = await run_orchestrator(req.message, state)

    state["interaction_history"].append({
        "role": "assistant",
        "content": response,
        "turn": state["turn_count"]
    })

    log_session(sid, state)

    return {
        "session_id": sid,
        "turn": state["turn_count"],
        "response": response,
        "state_snapshot": {
            "scaffold_stage": state["scaffold_stage"],
            "passivity_alert": state["passivity_alert"],
            "turn_type": state["latest_turn_type"],
            "rpi_events": state["rpi_events"]
        }
    }

def log_session(sid: str, state: SessionState):
    os.makedirs("logs", exist_ok=True)
    path = f"logs/{sid}.json"
    with open(path, "w") as f:
        json.dump(dict(state), f, indent=2)

@app.get("/health")
def health():
    return {"status": "AEGIS is running"} 
