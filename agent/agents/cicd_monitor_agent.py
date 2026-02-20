"""Node 7: CICDMonitorAgent — Poll GitHub Actions and record CI/CD results."""

from datetime import datetime, timezone
from tools.github_api_tools import poll_workflow_status


def cicd_monitor_node(state: dict) -> dict:
    """
    Monitor the GitHub Actions CI/CD pipeline after pushing.
    Records the iteration result in the CI/CD timeline.
    """
    # Use effective_repo_url (fork if forked, otherwise original)
    github_url = state.get("effective_repo_url") or state["github_url"]
    branch_name = state["branch_name"]
    github_token = state.get("github_token", "")
    iteration = state.get("iteration", 1)
    ci_cd_timeline = list(state.get("ci_cd_timeline", []))

    print(f"[AGENT] monitoring CI/CD for iteration {iteration}...")

    result = poll_workflow_status(github_url, branch_name, github_token=github_token, timeout=300, poll_interval=15)

    ci_status = result["status"]  # PASSED | FAILED | TIMEOUT | SKIPPED
    if ci_status == "TIMEOUT":
        ci_status = "FAILED"
    # SKIPPED = repo has no GitHub Actions — record as-is (not FAILED)

    ci_cd_timeline.append({
        "iteration": iteration,
        "status": ci_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    print(f"[AGENT] CI/CD iteration {iteration}: {ci_status}")

    logs = list(state.get("logs", []))
    logs.append(f"CI/CD iteration {iteration}: {ci_status}")

    return {
        **state,
        "ci_cd_status": ci_status,
        "ci_cd_timeline": ci_cd_timeline,
        "current_step": "Monitoring CI/CD...",
        "logs": logs,
    }
