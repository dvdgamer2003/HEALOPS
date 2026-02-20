"""FastAPI backend for the CI/CD Healing Agent — replaces the Node.js backend."""

import os
import re
import time
import uuid
import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from mangum import Mangum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

load_dotenv()

from graph.agent_graph import agent_graph


# ─── MongoDB Setup ───
mongo_client = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect/disconnect MongoDB."""
    global mongo_client, db
    mongo_uri = os.getenv("MONGODB_URI")
    if mongo_uri:
        mongo_client = MongoClient(mongo_uri)
        try:
            db = mongo_client.get_default_database()
        except Exception:
            db = mongo_client["cicd_healing"]
        print("✓ Agent connected to MongoDB")
    else:
        print("⚠ MONGODB_URI not set — status updates will be skipped")
    yield
    if mongo_client:
        mongo_client.close()


app = FastAPI(
    title="CI/CD Healing Agent",
    description="LangGraph-powered autonomous CI/CD repair agent",
    version="2.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "https://healops.vercel.app",
    "https://healops-e63x.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    # Allow all Vercel preview URLs for this project
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://healops.*\.vercel\.app",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)


# ─── Request Schemas ───
class RunAgentRequest(BaseModel):
    github_url: str
    team_name: str
    leader_name: str
    github_token: str


class InvokeRequest(BaseModel):
    run_id: str
    github_url: str
    team_name: str
    leader_name: str
    github_token: str


# ─── Helpers ───
GH_PATTERN = re.compile(r"^https://github\.com/[\w.\-]+/[\w.\-]+/?$")


def update_mongo_status(run_id: str, status: str, current_step: str, results=None, logs=None):
    """Update run status in MongoDB."""
    if db is None:
        return
    update = {"status": status, "currentStep": current_step}
    if results:
        update["results"] = results
    ops = {"$set": update}
    if logs:
        ops["$push"] = {"logs": {"$each": logs}}
    db.runresults.update_one({"runId": run_id}, ops)


async def run_agent_pipeline(payload: InvokeRequest):
    """Run the full agent pipeline in a background task."""
    run_id = payload.run_id

    try:
        update_mongo_status(run_id, "RUNNING", "Starting agent...")

        # Build initial state
        initial_state = {
            "run_id": run_id,
            "github_url": payload.github_url,
            "team_name": payload.team_name,
            "leader_name": payload.leader_name,
            "github_token": payload.github_token,
            "branch_name": "",
            "repo_local_path": "",
            "test_framework": "",
            "test_files": [],
            "test_results": [],
            "failures": [],
            "fixes_applied": [],
            "commit_count": 0,
            "push_succeeded": False,
            "iteration": 1,
            "ci_cd_timeline": [],
            "ci_cd_status": "PENDING",
            "start_time": time.time(),
            "end_time": 0.0,
            "current_step": "Initializing...",
            "results": {},
            "error_message": "",
            "repo_cleaned": False,
            "logs": [],
            "files_failed_before": [],
            "test_exit_class": "",
            "generated_test_files": [],
            "config_fix_changed": False,
            "tests_generated": False,
            "no_diff_counts": {},
        }

        # Track logs already sent to MongoDB to only push new ones
        last_log_count = 0

        # Execute the graph
        final_state = None
        async for state in agent_graph.astream(initial_state):
            # state is a dict of {node_name: updated_state}
            for node_name, node_state in state.items():
                current_step = node_state.get("current_step", "Processing...")
                all_logs = node_state.get("logs", [])
                new_logs = all_logs[last_log_count:]
                last_log_count = len(all_logs)
                update_mongo_status(run_id, "RUNNING", current_step, logs=new_logs if new_logs else None)
                final_state = node_state

        # Save final results
        if final_state and "results" in final_state:
            ci_status = final_state["results"].get("ci_cd_status", "FAILED")
            update_mongo_status(run_id, ci_status, "Completed", final_state["results"])
        else:
            update_mongo_status(run_id, "FAILED", "Agent completed without results")

    except Exception as e:
        print(f"[agent] Pipeline error: {e}")
        update_mongo_status(run_id, "FAILED", f"Error: {str(e)[:200]}")


# ─── API Endpoints ───

@app.post("/api/run-agent")
async def run_agent(request: RunAgentRequest):
    """
    POST /api/run-agent
    Accepts { github_url, team_name, leader_name }.
    Creates a run record, launches the agent pipeline, returns runId.
    """
    # Validation
    if not GH_PATTERN.match(request.github_url):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format.")

    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected.")

    # Create run record
    run_id = str(uuid.uuid4())
    db.runresults.insert_one({
        "runId": run_id,
        "status": "RUNNING",
        "currentStep": "Initializing...",
        "logs": [],
        "results": None,
    })

    # Launch pipeline in background
    invoke_payload = InvokeRequest(
        run_id=run_id,
        github_url=request.github_url,
        team_name=request.team_name,
        leader_name=request.leader_name,
        github_token=request.github_token,
    )
    asyncio.create_task(run_agent_pipeline(invoke_payload))

    return {"runId": run_id, "status": "RUNNING"}


@app.get("/api/status/{run_id}")
async def get_status(run_id: str):
    """
    GET /api/status/:runId
    Returns current run status + activity logs from MongoDB.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected.")

    run = db.runresults.find_one({"runId": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    return {
        "runId": run["runId"],
        "status": run["status"],
        "currentStep": run.get("currentStep", ""),
        "logs": run.get("logs", []),
    }


@app.get("/api/results/{run_id}")
async def get_results(run_id: str):
    """
    GET /api/results/:runId
    Returns full results when the run is complete.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected.")

    run = db.runresults.find_one({"runId": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    if run["status"] == "RUNNING":
        return {"runId": run["runId"], "status": "RUNNING", "message": "Agent is still running."}

    return run.get("results") or {"runId": run["runId"], "status": run["status"]}


@app.get("/")
async def root():
    return {"service": "HEALOPS CI/CD Healing Agent", "status": "ok", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cicd-healing-agent"}


# Vercel serverless handler — bridges FastAPI (ASGI) to Vercel's Python runtime
# lifespan="off" prevents MongoDB lifespan from blocking cold starts
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

