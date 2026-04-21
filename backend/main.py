# Build FastAPI Endpoint 

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.state import create_session, SessionState
from core.orchestrator import run_orchestrator
import json, os, uuid

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User
from schemas import UserCreate, UserLogin
from auth import hash_password, verify_password, create_access_token, decode_access_token

app = FastAPI()
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, SessionState] = {}

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    domain_context: str = "academic research writing"


@app.post("/chat")
async def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    sid = req.session_id or str(uuid.uuid4())

    if sid not in sessions:
        sessions[sid] = create_session(sid, req.domain_context)
        sessions[sid]["user_id"] = current_user.id
        sessions[sid]["created_at"] = __import__("datetime").datetime.utcnow().isoformat()

    state = sessions[sid]

    if state.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this session")
    
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

    state["updated_at"] = __import__("datetime").datetime.utcnow().isoformat()

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
    
@app.get("/report/{session_id}")
def get_report(session_id: str, current_user: User = Depends(get_current_user)):
    from core.assembler import compute_metrics

    if session_id not in sessions:
        path = f"logs/{session_id}.json"
        if not os.path.exists(path):
            return {"error": "Session not found"}
        with open(path, "r") as f:
            state = json.load(f)
    else:
        state = sessions[session_id]

    if state.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this report")

    metrics = compute_metrics(state)

    return {
        "session_id": session_id,
        "turn_count": state["turn_count"],
        "metrics": metrics,
        "raw_events": {
            "rpi_events": state["rpi_events"],
            "reflection_events": state["reflection_events"],
            "transparency_events": state["transparency_events"]
        }
    }

@app.get("/health")
def health():
    return {"status": "AEGIS is running"}

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=user.username,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "username": new_user.username
    }

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({
        "sub": existing_user.username,
        "user_id": existing_user.id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": existing_user.id,
        "username": existing_user.username
    }


@app.get("/my-sessions")
def get_my_sessions(current_user: User = Depends(get_current_user)):
    os.makedirs("logs", exist_ok=True)

    results = []

    for filename in os.listdir("logs"):
        if not filename.endswith(".json"):
            continue

        path = os.path.join("logs", filename)
        try:
            with open(path, "r") as f:
                state = json.load(f)

            if state.get("user_id") != current_user.id:
                continue

            interaction_history = state.get("interaction_history", [])
            preview = ""
            for item in interaction_history:
                if item.get("role") == "user":
                    preview = item.get("content", "")
                    break

            results.append({
                "session_id": filename.replace(".json", ""),
                "created_at": state.get("created_at"),
                "updated_at": state.get("updated_at"),
                "turn_count": state.get("turn_count", 0),
                "preview": preview
            })
        except Exception:
            continue

    results.sort(key=lambda x: x.get("updated_at") or "", reverse=True)

    return {"sessions": results}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    if session_id in sessions:
        state = sessions[session_id]
        if state.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have access to this session")
        del sessions[session_id]

    path = f"logs/{session_id}.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            state = json.load(f)

        if state.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have access to this session")

        os.remove(path)
        return {"message": "Session deleted successfully"}

    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/sessions/{session_id}")
def get_session(session_id: str, current_user: User = Depends(get_current_user)):
    if session_id in sessions:
        state = sessions[session_id]
    else:
        path = f"logs/{session_id}.json"
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Session not found")
        with open(path, "r") as f:
            state = json.load(f)

    if state.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this session")

    return {
        "session_id": session_id,
        "turn_count": state.get("turn_count", 0),
        "interaction_history": state.get("interaction_history", []),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at")
    }