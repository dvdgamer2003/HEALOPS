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
import certifi
from pymongo import MongoClient
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

from graph.agent_graph import build_agent_graph

# Initialize persistent memory for LangGraph
memory = MemorySaver()
agent_graph = build_agent_graph().compile(checkpointer=memory, interrupt_before=["wait_for_approval"])

# ─── MongoDB Setup ───
mongo_client = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect/disconnect MongoDB."""
    global mongo_client, db
    mongo_uri = os.getenv("MONGODB_URI")
    if mongo_uri:
        mongo_client = MongoClient(
            mongo_uri, 
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000
        )
        try:
            # Force connection check to catch IP Whitelist/SSL errors immediately
            mongo_client.admin.command('ping')
            db = mongo_client.get_default_database()
            print("✓ Agent connected to MongoDB")
        except Exception as e:
            print("\n" + "="*70)
            print("❌ MONGODB CONNECTION FATAL ERROR ❌")
            print("The agent failed to connect to your MongoDB Atlas cluster.")
            print("Reason: Most likely your current IP Address is NOT whitelisted.")
            print("Fix: Go to MongoDB Atlas -> Network Access -> Add IP -> 'Allow Access from Anywhere' (0.0.0.0/0)")
            print("="*70 + "\n")
            db = None
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global error handler — ensures CORS headers are always present ──────────
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


# ─── Request Schemas ───
class RunAgentRequest(BaseModel):
    github_url: str
    commit_message: str
    github_token: str
    auto_commit: bool = False


class InvokeRequest(BaseModel):
    run_id: str
    github_url: str
    commit_message: str
    github_token: str
    auto_commit: bool

class ResumeRequest(BaseModel):
    approve: bool


# ─── Helpers ───
GH_PATTERN = re.compile(r"^https://github\.com/[\w.\-]+/[\w.\-]+/?$")

# Global dictionary to track active agent tasks for cancellation
active_runs: dict[str, asyncio.Task] = {}


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


def _process_graph_state(run_id: str, state_iter, initial_log_count: int = 0) -> dict:
    """Helper to process the stream of graph states."""
    last_log_count = initial_log_count
    final_state = None
    
    for state in state_iter:
        for node_name, node_state in state.items():
            current_step = node_state.get("current_step", "Processing...")
            all_logs = node_state.get("logs", [])
            new_logs = all_logs[last_log_count:]
            last_log_count = len(all_logs)
            update_mongo_status(run_id, "RUNNING", current_step, logs=new_logs if new_logs else None)
            final_state = node_state
    
    return final_state, last_log_count


async def run_agent_pipeline(payload: InvokeRequest):
    """Run the full agent pipeline in a background task."""
    run_id = payload.run_id

    try:
        update_mongo_status(run_id, "RUNNING", "Starting agent...")

        # Build initial state
        initial_state = {
            "run_id": run_id,
            "github_url": payload.github_url,
            "commit_message": payload.commit_message,
            "github_token": payload.github_token,
            "auto_commit": payload.auto_commit,
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
            "effective_repo_url": "",
            "forked_from": "",
        }

        # Configuration for thread ID matching tracking state in memory
        config = {"configurable": {"thread_id": run_id}}

        # Execute the graph
        # Currently astream runs blocking synchronous nodes in an async generator.
        # But wait, python's list comprehension over a generator works fine, but astream is async.
        last_log_count = 0
        final_state = None
        
        async for state in agent_graph.astream(initial_state, config):
            for node_name, node_state in state.items():
                # LangGraph emits interrupt tuples (not dicts) at interrupt_before nodes.
                # Skip these safely; the interrupt is handled below via get_state().
                if not isinstance(node_state, dict):
                    continue
                current_step = node_state.get("current_step", "Processing...")
                all_logs = node_state.get("logs", [])
                new_logs = all_logs[last_log_count:]
                last_log_count = len(all_logs)
                update_mongo_status(run_id, "RUNNING", current_step, logs=new_logs if new_logs else None)
                final_state = node_state

        # Check if the graph is paused/interrupted
        graph_state = agent_graph.get_state(config)
        if graph_state.next and "wait_for_approval" in graph_state.next:
            # We hit the interrupt hook. Update MongoDB so the UI knows we are waiting.
            print(f"[agent] Pipeline paused for user approval on run {run_id}")
            update_mongo_status(run_id, "AWAITING_APPROVAL", "Pending User Confirmation")
            return

        # If it finished normally without interruption, save final results
        if final_state and "results" in final_state:
            ci_status = final_state["results"].get("ci_cd_status", "FAILED")
            update_mongo_status(run_id, ci_status, "Completed", final_state["results"])
        else:
            update_mongo_status(run_id, "FAILED", "Agent completed without results")

    except asyncio.CancelledError:
        print(f"[agent] Pipeline {run_id} was manually canceled.")
        # We don't need to update mongo status here, the /api/stop handler does it immediately
        # to ensure the UI feels responsive.
        raise
    except Exception as e:
        print(f"[agent] Pipeline error: {e}")
        update_mongo_status(run_id, "FAILED", f"Error: {str(e)[:200]}")
    finally:
        # Clean up the task reference when done (or canceled)
        active_runs.pop(run_id, None)


async def resume_agent_pipeline(run_id: str, approve: bool):
    """Resume a paused agent pipeline in the background."""
    try:
        config = {"configurable": {"thread_id": run_id}}
        graph_state = agent_graph.get_state(config)
        
        if not graph_state.next:
            print(f"[agent] Cannot resume {run_id}: no pending tasks.")
            return

        if not approve:
            # If user rejected the commit, we need to bypass 'wait_for_approval' and 'commit_and_push'
            # and head straight to 'finalize'. The cleanest way in LangGraph is to inject 
            # node state dynamically. BUT, we can also just update state to say "user aborted"
            update_mongo_status(run_id, "REJECTED", "Commit Aborted by User")
            return

        update_mongo_status(run_id, "RUNNING", "Resuming agent for commit...", logs=["User approved commit... resuming."])

        last_log_count = len(graph_state.values.get("logs", []))
        final_state = None

        # Resume the graph by passing None instead of initial_state
        async for state in agent_graph.astream(None, config):
            for node_name, node_state in state.items():
                # Skip interrupt tuples emitted by LangGraph at breakpoints
                if not isinstance(node_state, dict):
                    continue
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
            
    except asyncio.CancelledError:
        print(f"[agent] Resume Pipeline {run_id} was manually canceled.")
        raise
    except Exception as e:
        print(f"[agent] Pipeline resume error: {e}")
        update_mongo_status(run_id, "FAILED", f"Error on resume: {str(e)[:200]}")
    finally:
        # Clean up the task reference when done (or canceled)
        active_runs.pop(run_id, None)

# ─── API Endpoints ───

@app.post("/api/run-agent")
async def run_agent(request: RunAgentRequest):
    """
    POST /api/run-agent
    Accepts { github_url, commit_message, github_token, auto_commit }.
    Creates a run record, launches the agent pipeline, returns runId.
    """
    # Validation
    if not GH_PATTERN.match(request.github_url):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format.")

    if db is None:
        raise HTTPException(
            status_code=503, 
            detail="MongoDB Connection Failed: Please ensure your IP is whitelisted in MongoDB Atlas under 'Network Access'."
        )

    # Create run record
    run_id = str(uuid.uuid4())
    db.runresults.insert_one({
        "runId": run_id,
        "status": "RUNNING",
        "currentStep": "Initializing...",
        "logs": [],
        "results": None,
    })

    # Launch pipeline in background and track it
    invoke_payload = InvokeRequest(
        run_id=run_id,
        github_url=request.github_url,
        commit_message=request.commit_message,
        github_token=request.github_token,
        auto_commit=request.auto_commit,
    )
    task = asyncio.create_task(run_agent_pipeline(invoke_payload))
    active_runs[run_id] = task

    return {"runId": run_id, "status": "RUNNING"}


@app.post("/api/resume/{run_id}")
async def resume_agent(run_id: str, request: ResumeRequest):
    """
    POST /api/resume/{run_id}
    Body: { approve: true|false }
    Resumes a paused agent pipeline (or aborts it).
    """
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected.")

    run = db.runresults.find_one({"runId": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    if run["status"] != "AWAITING_APPROVAL":
        raise HTTPException(status_code=400, detail="This run is not awaiting approval.")

    # Launch resumption in background task and track it
    task = asyncio.create_task(resume_agent_pipeline(run_id, request.approve))
    if request.approve:
        active_runs[run_id] = task

    new_status = "RUNNING" if request.approve else "REJECTED"
    if not request.approve:
        db.runresults.update_one({"runId": run_id}, {"$set": {"status": "REJECTED", "currentStep": "Aborted by User"}})

    return {"runId": run_id, "status": new_status, "message": "Resume signal processed."}

@app.post("/api/stop/{run_id}")
async def stop_agent(run_id: str):
    """
    POST /api/stop/{run_id}
    Forcefully cancels the running agent task if it exists.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected.")

    # 1. Cancel the asyncio background Task
    task = active_runs.get(run_id)
    cancelled = False
    if task and not task.done():
        task.cancel()
        cancelled = True
        print(f"[agent] Sent cancellation signal to run_id: {run_id}")
    else:
        print(f"[agent] Warning: No active task found for {run_id} to cancel (might be already finished or paused).")

    # 2. Update DB status immediately so UI reacts instantly
    db.runresults.update_one(
        {"runId": run_id}, 
        {"$set": {"status": "ABORTED", "currentStep": "Manually stopped by User"}}
    )
    
    # 3. Cleanup tracking
    active_runs.pop(run_id, None)

    return {
        "runId": run_id, 
        "status": "ABORTED", 
        "message": "Agent strictly aborted." if cancelled else "Agent marked as aborted (no active task)."
    }

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

    if run["status"] == "RUNNING" or run["status"] == "AWAITING_APPROVAL":
        return {"runId": run["runId"], "status": run["status"], "message": "Agent is still running."}

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

