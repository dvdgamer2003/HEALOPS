"""Git operations using GitPython — clone, branch, commit, push, cleanup."""

import os
import shutil

# Prevent GitPython from crashing on import when git binary is not in PATH.
# Required for Vercel/Lambda environments where git is not pre-installed.
# The pipeline nodes themselves will still fail gracefully at runtime if git
# is unavailable, but at least the API server boots and serves /health etc.
os.environ.setdefault("GIT_PYTHON_REFRESH", "quiet")

try:
    import git
    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    print("[git_tools] GitPython not available — git operations will be skipped")


def clone_repo(github_url: str, dest_path: str, github_token: str = "") -> git.Repo:
    """
    Clone a GitHub repository into dest_path.
    If github_token is provided, it injects the token into the HTTPS URL.
    """
    clone_url = github_url
    if github_token and github_url.startswith("https://"):
        clone_url = github_url.replace("https://", f"https://{github_token}@")
        
    repo = git.Repo.clone_from(clone_url, dest_path)
    print(f"[git_tools] Cloned {github_url} -> {dest_path}")
    return repo


def create_branch_and_checkout(repo_path: str, branch_name: str) -> None:
    """Create a new branch and switch to it."""
    repo = git.Repo(repo_path)
    repo.git.checkout("-b", branch_name)
    print(f"[git_tools] Created and checked out branch: {branch_name}")


def commit_and_push(repo_path: str, branch_name: str, commit_message: str) -> bool:
    """
    Stage all changes, commit with [AI-AGENT] prefix, and push to origin.
    Returns True if changes were committed AND pushed successfully.
    Returns False if nothing to commit or if push failed.
    """
    repo = git.Repo(repo_path)
    repo.git.add("--all")

    # Check if there are changes to commit
    if repo.is_dirty() or repo.untracked_files:
        repo.index.commit(f"[AI-AGENT] {commit_message}")

        # Push - explicitly propagate failures so caller can handle them
        try:
            repo.git.push("origin", branch_name)
            print(f"[git_tools] Committed and pushed: {commit_message}")
            return True
        except Exception as e:
            print(f"[git_tools] Push rejected by upstream: {e}")
            raise RuntimeError(f"Push rejected: {e}")
    else:
        print("[git_tools] No changes to commit")
        return False


def cleanup_repo(repo_path: str) -> bool:
    """Delete the cloned repository directory after work is done."""
    import stat

    def _on_rm_error(func, path, exc_info):
        """Handle read-only .git files on Windows."""
        os.chmod(path, stat.S_IWRITE)
        func(path)

    try:
        if os.path.exists(repo_path):
            # Close git handles to release .git locks
            try:
                repo = git.Repo(repo_path)
                repo.close()
                del repo
            except Exception:
                pass
            shutil.rmtree(repo_path, onerror=_on_rm_error)
            print(f"[git_tools] Cleaned up local repo: {repo_path}")
            return True
        else:
            print(f"[git_tools] Repo path not found (already cleaned): {repo_path}")
            return True
    except Exception as e:
        print(f"[git_tools] Cleanup failed for {repo_path}: {e}")
        return False


def generate_branch_name(commit_message: str) -> str:
    import re
    import uuid
    # Create a safe branch name from the commit message
    clean_msg = re.sub(r'[^a-zA-Z0-9\s]', '', commit_message).strip().replace(" ", "-").lower()
    # Keep it reasonably short
    short_msg = clean_msg[:30] if clean_msg else "auto"
    uid = str(uuid.uuid4())[:6]
    return f"healops/{short_msg}-{uid}"
