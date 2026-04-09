# AEGIS Setup & Usage Guide
Document is meant for Windows user now, will be updated to Linux/Mac in the future
---

## 🛠️ Prerequisites

* Python installed (3.8+ recommended)
* Virtual environment set up (`venv`)
* Dependencies installed (`pip install -r requirements.txt`)

---

## ▶️ Running the Application

### 1. Activate Virtual Environment

```bash
venv\Scripts\activate
```

### 2. Start the FastAPI Server

```bash
uvicorn main:app --reload
```

### 3. Access API Documentation

Open your browser and navigate to:

```
http://localhost:8000/docs
```

This provides an interactive Swagger UI to test endpoints.

---

## 🧪 Health Check

Open a **new terminal** and run:

```bash
curl http://localhost:8000/health
```

---

## 💬 Chat Endpoint Test

Send a POST request to the `/chat` endpoint:

```bash
curl -X POST http://localhost:8000/chat \
-H "Content-Type: application/json" \
-d "{\"message\": \"Help me find the gap in multi-agent AI literature\"}"
```

---



