"""Node 1: RepoCloneAgent — Clone the repository and create a fix branch.

Fork Fallback:
    If the provided GitHub token does NOT have push access to the target repo,
    the agent automatically forks the repo to the user's own GitHub account
    and clones from the fork instead. All subsequent fixes are pushed to the fork.
"""

import os
from tools.git_tools import clone_repo, create_branch_and_checkout, generate_branch_name
from tools.github_api_tools import check_write_access, fork_repo


def repo_clone_node(state: dict) -> dict:
    """
    Clone the GitHub repository and create a new fix branch.

    Flow:
        1. Check if user token has push access to the target repo.
        2a. If YES  → clone directly from the target repo.
        2b. If NO   → fork the repo to the user's GitHub account, clone from fork.
        3. Create a fix branch on the cloned repo.
    Updates state with: repo_local_path, branch_name, effective_repo_url, forked_from.
    """
    run_id = state["run_id"]
    github_url = state["github_url"]
    commit_message = state["commit_message"]
    github_token = state.get("github_token", "")

    # Set up local path
    repo_path = os.path.join("/tmp", run_id, "repo")
    os.makedirs(os.path.dirname(repo_path), exist_ok=True)

    logs = list(state.get("logs", []))
    forked_from = None
    effective_repo_url = github_url  # URL we actually clone/push to

    # ── Step 1: Check write access ──────────────────────────────────────────
    if github_token:
        has_access = check_write_access(github_url, github_token)
    else:
        has_access = False  # No token → assume no access

    if not has_access and github_token:
        # ── Step 2b: Fork → clone from fork ─────────────────────────────────
        print(f"[AGENT] No write access to {github_url} — forking to user's account...")
        try:
            fork_clone_url, fork_html_url = fork_repo(github_url, github_token)
            effective_repo_url = fork_html_url
            forked_from = github_url
            logs.append(f"No write access — using fork: {fork_html_url}")
            logs.append(f"Cloned fork")
            print(f"[AGENT] ✓ Forked → {fork_html_url}, cloning fork...")
            clone_repo(fork_clone_url, repo_path, "")  # Token already embedded in URL
        except Exception as e:
            # Fork failed — fall back to read-only clone of original
            print(f"[AGENT] Fork failed ({e}), falling back to direct clone (read-only)")
            logs.append(f"Fork failed — cloning read-only")
            clone_repo(github_url, repo_path, github_token)
    else:
        # ── Step 2a: Direct clone ────────────────────────────────────────────
        print(f"[AGENT] Write access confirmed — cloning {github_url} directly")
        clone_repo(github_url, repo_path, github_token)
        logs.append(f"Repository cloned")

    # ── Step 3: Create fix branch ────────────────────────────────────────────
    branch_name = generate_branch_name(commit_message)
    create_branch_and_checkout(repo_path, branch_name)
    logs.append(f"Branch ready: {branch_name}")
    print(f"[AGENT] cloned repo, created branch: {branch_name}")

    return {
        **state,
        "repo_local_path": repo_path,
        "branch_name": branch_name,
        "effective_repo_url": effective_repo_url,   # URL used for CI/CD monitoring + branch link
        "forked_from": forked_from,                 # Original repo URL if forked, else None
        "current_step": "Repository cloned — fix branch created",
        "logs": logs,
    }
