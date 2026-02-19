"""Node 1: RepoCloneAgent — Clone the repository and create a fix branch."""

import os
from tools.git_tools import clone_repo, create_branch_and_checkout, generate_branch_name


def repo_clone_node(state: dict) -> dict:
    """
    Clone the GitHub repository directly (no token) and create a new fix branch.
    Updates state with repo_local_path, branch_name.
    """
    run_id = state["run_id"]
    github_url = state["github_url"]
    team_name = state["team_name"]
    leader_name = state["leader_name"]
    github_token = state.get("github_token", "")

    # Set up local path
    repo_path = os.path.join("/tmp", run_id, "repo")
    os.makedirs(os.path.dirname(repo_path), exist_ok=True)

    # Clone directly (uses provided token or system credentials)
    print(f"[AGENT] cloning repo {github_url}")
    clone_repo(github_url, repo_path, github_token)

    # Create branch
    branch_name = generate_branch_name(team_name, leader_name)
    create_branch_and_checkout(repo_path, branch_name)

    logs = list(state.get("logs", []))
    logs.append(f"✓ Cloned {github_url}")
    logs.append(f"✓ Created branch: {branch_name}")
    print(f"[AGENT] cloned repo, created branch: {branch_name}")

    return {
        **state,
        "repo_local_path": repo_path,
        "branch_name": branch_name,
        "current_step": "Cloning repo (direct)...",
        "logs": logs,
    }
