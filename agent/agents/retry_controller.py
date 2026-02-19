"""Node 8: RetryController — Decide whether to retry or finalize."""

import json
import os
import time
from schemas.results_schema import AgentResults, ScoreBreakdown, FixEntry, CICDEntry
from tools.git_tools import cleanup_repo

MAX_ITERATIONS = 5


def should_retry(state: dict) -> str:
    """
    Conditional edge function for the LangGraph graph.
    Returns 'run_tests' to retry or 'finalize' to stop.
    """
    # Fatal error (e.g. push 403) — stop immediately
    if state.get("error_message"):
        return "finalize"

    ci_status = state.get("ci_cd_status", "FAILED")
    iteration = state.get("iteration", 1)

    if ci_status == "PASSED":
        return "finalize"
    if iteration >= MAX_ITERATIONS:
        return "finalize"

    return "run_tests"


def retry_increment_node(state: dict) -> dict:
    """Increment the iteration counter and reset per-iteration flags before retrying."""
    new_iter = state.get("iteration", 1) + 1
    print(f"[AGENT] retrying — iteration {new_iter}/{MAX_ITERATIONS}")
    return {
        **state,
        "iteration": new_iter,
        "config_fix_changed": False,       # reset so next iter re-evaluates
        "current_step": f"Retrying (iteration {new_iter}/{MAX_ITERATIONS})...",
    }


def finalize_node(state: dict) -> dict:
    """
    Generate the final results JSON.
    Calculates scores, sets end time, builds AgentResults model,
    and writes results.json to the repo directory.
    """
    end_time = time.time()
    start_time = state.get("start_time", end_time)
    time_taken = end_time - start_time

    fixes = state.get("fixes_applied", [])
    commit_count = state.get("commit_count", 0)
    ci_cd_timeline = state.get("ci_cd_timeline", [])
    error_message = state.get("error_message", "")

    # Calculate score
    score = ScoreBreakdown()
    score.calculate(time_taken, commit_count)

    total_failures = len(state.get("failures", []))
    total_fixes = sum(1 for f in fixes if f.get("status") == "Fixed")

    # Construct branch URL for the frontend
    github_url = state.get("github_url", "").rstrip("/").rstrip(".git")
    branch_name = state.get("branch_name", "")
    branch_url = f"{github_url}/tree/{branch_name}" if github_url and branch_name else ""

    # If there was a fatal error, override CI/CD status
    # If there was a fatal error, override CI/CD status
    ci_cd_status = state.get("ci_cd_status", "FAILED")
    if error_message:
        ci_cd_status = "FAILED"
    elif state.get("test_exit_class") == "PASSED":
        # Ensure status reflects local success even if remote push was skipped
        ci_cd_status = "PASSED"

    results = AgentResults(
        run_id=state["run_id"],
        team_name=state["team_name"],
        leader_name=state["leader_name"],
        repo_url=state["github_url"],
        branch=state.get("branch_name", ""),
        branch_url=branch_url,
        total_failures=total_failures,
        total_fixes=total_fixes,
        ci_cd_status=ci_cd_status,
        iterations_used=state.get("iteration", 1),
        commit_count=commit_count,
        time_taken_seconds=round(time_taken, 2),
        score=score,
        fixes=[FixEntry(**f) for f in fixes],
        ci_cd_timeline=[CICDEntry(**e) for e in ci_cd_timeline],
    )

    results_dict = results.model_dump()

    # Attach error_message to results so the frontend can display it
    if error_message:
        results_dict["error_message"] = error_message

    # ── Write results.json to disk ────────────────────────────────────────────
    _write_results_json(state, results_dict, total_failures, total_fixes, ci_cd_status, time_taken)

    # Clean up the cloned repo directory
    repo_path = state.get("repo_local_path", "")
    repo_cleaned = cleanup_repo(repo_path) if repo_path else False

    # Set current_step to a user-friendly message
    step_msg = "Completed — local repo cleaned up" if repo_cleaned else "Completed"
    if error_message:
        step_msg = f"Error: {error_message[:150]} (repo {'cleaned' if repo_cleaned else 'NOT cleaned'})"

    print(f"[AGENT] finalizing results — status: {ci_cd_status}, fixes: {total_fixes}/{total_failures}")

    return {
        **state,
        "end_time": end_time,
        "results": results_dict,
        "repo_cleaned": repo_cleaned,
        "current_step": step_msg,
    }


def _write_results_json(state: dict, full_results: dict, total_failures: int,
                         total_fixes: int, ci_cd_status: str, time_taken: float) -> None:
    """Write results.json to the repo directory (before cleanup)."""
    repo_path = state.get("repo_local_path", "")
    if not repo_path or not os.path.isdir(repo_path):
        return

    # Build the simplified results.json as requested
    simplified = {
        "repository": state.get("github_url", ""),
        "branch": state.get("branch_name", ""),
        "iterations": state.get("iteration", 1),
        "failures_detected": total_failures,
        "fixes_applied": total_fixes,
        "final_status": "PASSED" if ci_cd_status == "PASSED" else "FAILED",
        "time_taken": f"{round(time_taken)}s",
    }

    try:
        results_path = os.path.join(repo_path, "results.json")
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump(simplified, f, indent=2, ensure_ascii=False)
            
        # Also write safely to the agent root directory so it survives cleanup
        root_results_path = os.path.join(os.getcwd(), "results.json")
        with open(root_results_path, "w", encoding="utf-8") as f:
            json.dump(simplified, f, indent=2, ensure_ascii=False)
            
        print(f"[AGENT] ✓ Written results.json to {results_path} and {root_results_path}")
    except Exception as e:
        print(f"[AGENT] ✗ Failed to write results.json: {e}")
