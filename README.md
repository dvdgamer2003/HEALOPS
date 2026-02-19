# 🤖 HEALOPS - Autonomous CI/CD Healing Agent

> AI-powered autonomous agent that clones a GitHub repo, detects code failures, generates fixes using the native Mistral API, commits them, and monitors the CI/CD pipeline until all tests pass.

![AI/ML • DevOps Automation • Agentic Systems](https://img.shields.io/badge/Track-AI%2FML%20%7C%20DevOps%20%7C%20Agentic-6366f1?style=for-the-badge)

---

## 🏗️ Architecture

```
[React Dashboard — Vercel/Local]
        │
        │  POST /api/run-agent
        │  GET  /api/status/:runId
        │  GET  /api/results/:runId
        ▼
[FastAPI Agent — Python — GCP Cloud Run/Local]
        │
        │  POST /invoke (internal)
        ▼
[LangGraph AI Agent — Python]
        │
        ├── 1. RepoCloneAgent      → git clone + create branch
        ├── 2. TestDiscoveryAgent   → auto-detect pytest/jest/mocha
        ├── 3. TestRunnerAgent      → run tests, capture failures
        ├── 4. CodeAnalysisAgent    → parse errors, identify bugs
        ├── 5. FixGeneratorAgent    → Mistral Large API fix generation
        ├── 6. CommitAgent          → commit + push to branch
        ├── 7. CICDMonitorAgent     → poll GitHub Actions
        └── 8. RetryOrFinish        → retry (≤5x) or finalize
        │
        ▼
[MongoDB Atlas] ← results stored & served to dashboard
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), TailwindCSS, Recharts, Zustand |
| **Backend API + Agent** | Python (FastAPI), LangGraph |
| **LLM** | Mistral Large Latest (Native API) |
| **Database** | MongoDB Atlas |
| **GitHub** | Octokit (Node) / PyGithub (Python) |
| **Deployment** | GCP Cloud Run, Vercel |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Project Structure

```
├── frontend/                  # React dashboard (Vite)
│   ├── src/
│   │   ├── components/        # UI Components
│   │   ├── store/             # Zustand state management
│   │   └── services/          # API client
│   ├── Dockerfile.dev         # Dockerfile for development
│   └── vite.config.js         # Proxy configuration
│
├── agent/                     # FastAPI Backend + LangGraph Agent
│   ├── agents/                # 8 agent node implementations
│   ├── graph/                 # LangGraph StateGraph definition
│   ├── tools/                 # Git, test runner, Gemini, GitHub API
│   ├── schemas/               # Pydantic models
│   ├── main.py                # FastAPI entry point
│   └── Dockerfile             # Python Dockerfile
│
├── docker-compose.yml         # Local development orchestration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Docker** & **Docker Compose**
- **MongoDB Atlas** cluster URI
- **Mistral API key**
- **GitHub Personal Access Token** (with repo + workflow permissions, input via the Frontend UI)

### 1. Clone this repo

```bash
git clone https://github.com/dvdgamer2003/HEALOPS.git
cd HEALOPS
```

### 2. Configure environment variables

Create a `.env` file in the root directory:

```ini
# Mistral API Key (Required)
MISTRAL_API_KEY=your_mistral_key

# MongoDB Atlas URI (Required for state persistence)
MONGODB_URI=mongodb+srv://...
```
*(Note: Your GitHub PAT Token is now provided safely through the Frontend Dashboard UI!)*

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

Access the dashboard at **http://localhost:3000**.
The agent API is available at **http://localhost:8000**.

### 4. Run Services Individually (No Docker)

**Agent (Python):**
```bash
cd agent
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (React):**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Endpoints (FastAPI — port 8000)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/run-agent` | Start a new healing agent run |
| `GET` | `/api/status/:runId` | Poll current run status |
| `GET` | `/api/results/:runId` | Get full results when complete |
| `GET` | `/health` | Health check |

---

## 📊 Scoring System

| Component | Points |
|---|---|
| Base Score | 100 |
| Speed Bonus (< 5 min) | +10 |
| Efficiency Penalty (> 20 commits) | −2 per extra commit |

---

## 📝 License

MIT © 2026
