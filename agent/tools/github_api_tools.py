"""GitHub API tools using PyGithub — workflow monitoring and status checks."""

import os
import time
from github import Github
from typing import Optional

# Cache repos known to lack GitHub Actions — avoids repeated 20s polls
_NO_WORKFLOW_REPOS: set[str] = set()


def get_github_client(github_token: str = "") -> Github:
    """Create an authenticated GitHub client."""
    token = github_token or os.getenv("GITHUB_TOKEN")
    if not token:
        raise ValueError("GitHub token is not provided or set in environment variables")
    return Github(token)


def extract_owner_repo(github_url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub URL."""
    # Handle URLs like https://github.com/owner/repo or https://github.com/owner/repo.git
    parts = github_url.rstrip("/").rstrip(".git").split("/")
    return parts[-2], parts[-1]


def check_write_access(github_url: str, github_token: str) -> bool:
    """
    Returns True if the authenticated user has push access to the given repo.
    Returns False if they are a collaborator without push rights or if the repo
    belongs to a different user.
    """
    try:
        gh = get_github_client(github_token)
        owner, repo_name = extract_owner_repo(github_url)
        repo = gh.get_repo(f"{owner}/{repo_name}")
        # PyGithub exposes permissions when authenticated
        perms = repo.permissions
        return bool(perms and perms.push)
    except Exception as e:
        print(f"[github_api_tools] Could not verify write access: {e}")
        return False


def fork_repo(github_url: str, github_token: str) -> str:
    """
    Fork the given repo to the authenticated user's GitHub account.
    Returns the HTTPS clone URL of the fork (with token injected).
    If the fork already exists, returns the existing fork URL.
    """
    gh = get_github_client(github_token)
    owner, repo_name = extract_owner_repo(github_url)
    source_repo = gh.get_repo(f"{owner}/{repo_name}")

    # Fork (GitHub returns existing fork if it already exists)
    fork = source_repo.create_fork()
    print(f"[github_api_tools] ✓ Forked → {fork.html_url}")

    # Wait briefly for GitHub to prepare the fork
    time.sleep(3)

    # Return authenticated clone URL for the fork
    fork_clone_url = f"https://{github_token}@github.com/{fork.full_name}.git"
    return fork_clone_url, fork.html_url


def get_latest_workflow_run(github_url: str, branch_name: str, github_token: str = "") -> Optional[dict]:
    """
    Fetch the latest GitHub Actions workflow run for a given branch.
    Returns: { 'id': int, 'status': str, 'conclusion': str, 'url': str } or None
    """
    try:
        gh = get_github_client(github_token)
        owner, repo_name = extract_owner_repo(github_url)
        repo = gh.get_repo(f"{owner}/{repo_name}")

        # Get workflow runs for the branch
        runs = repo.get_workflow_runs(branch=branch_name)

        if runs.totalCount == 0:
            return None

        latest = runs[0]
        return {
            "id": latest.id,
            "status": latest.status,           # queued, in_progress, completed
            "conclusion": latest.conclusion,    # success, failure, null
            "url": latest.html_url,
        }
    except Exception as e:
        print(f"[github_api_tools] Error fetching workflow run: {e}")
        return None


def poll_workflow_status(
    github_url: str,
    branch_name: str,
    github_token: str = "",
    timeout: int = 300,
    poll_interval: int = 15,
) -> dict:
    """
    Poll GitHub Actions until the workflow completes or times out.
    Returns: { 'status': 'PASSED' | 'FAILED' | 'TIMEOUT', 'details': dict | None }
    """
    start = time.time()
    no_workflow_count = 0
    max_no_workflow_attempts = 2  # Stop after 20s if no workflow exists

    # Fast path: if we already know this repo has no workflows, skip immediately
    repo_key = f"{github_url}:{branch_name}"
    if repo_key in _NO_WORKFLOW_REPOS:
        print(f"[github_api_tools] Known no-workflow repo — skipping CI/CD poll")
        return {"status": "SKIPPED", "details": None}

    while time.time() - start < timeout:
        run = get_latest_workflow_run(github_url, branch_name, github_token)

        if run is None:
            no_workflow_count += 1
            if no_workflow_count >= max_no_workflow_attempts:
                _NO_WORKFLOW_REPOS.add(repo_key)
                print(f"[github_api_tools] No workflow found after {no_workflow_count} attempts — caching as no-workflow repo")
                return {"status": "SKIPPED", "details": None}
            time.sleep(poll_interval)
            continue

        # Reset counter once a workflow is found
        no_workflow_count = 0

        if run["status"] == "completed":
            if run["conclusion"] == "success":
                return {"status": "PASSED", "details": run}
            else:
                return {"status": "FAILED", "details": run}

        # Still in progress
        print(f"[github_api_tools] Workflow {run['id']} status: {run['status']}, waiting...")
        time.sleep(poll_interval)

    return {"status": "TIMEOUT", "details": None}
