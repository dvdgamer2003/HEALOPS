"""Node 6: CommitAgent — Commit fixes and push to the branch."""

from tools.git_tools import commit_and_push


def commit_node(state: dict) -> dict:
    """
    Stage all changes, commit with [AI-AGENT] prefix, and push to origin.
    Always runs after fix generation (N6 in architecture).
    Sets error_message in state if push fails with a fatal auth error.
    """
    repo_path = state["repo_local_path"]
    branch_name = state["branch_name"]
    iteration = state.get("iteration", 1)
    commit_count = state.get("commit_count", 0)
    fixes_applied = state.get("fixes_applied", [])

    # Count fixes with status=Fixed in this iteration
    fix_count = sum(1 for f in fixes_applied if f["status"] == "Fixed")
    gen_count = sum(1 for f in fixes_applied if f["status"] == "Generated")

    # Use user's commit message if provided, otherwise generate one
    base_message = state.get("commit_message", "[AI-AGENT] chore: Add Tests and Fixes").strip()
    if not base_message:
        base_message = "[AI-AGENT] chore: Add Tests and Fixes"

    commit_message = f"{base_message} - Locally verified ({gen_count} tests generated, {fix_count} fixes applied)"

    try:
        print(f"[AGENT] committing locally verified code ({gen_count} tests, {fix_count} fixes)")
        pushed = commit_and_push(repo_path, branch_name, commit_message)

        if pushed:
            commit_count += 1
            print(f"[AGENT] pushed successfully")
            logs = list(state.get("logs", []))
            logs.append(f"Changes pushed to GitHub ({gen_count} test(s), {fix_count} fix(es) applied)")
        else:
            print(f"[AGENT] nothing to commit")
            logs = list(state.get("logs", []))
            logs.append("Nothing new to commit")

        return {
            **state,
            "commit_count": commit_count,
            "push_succeeded": pushed,
            "current_step": "Pushing verified fixes to GitHub...",
            "logs": logs,
        }

    except Exception as e:
        error_str = str(e)
        print(f"[AGENT] push failed: {error_str}")

        logs = list(state.get("logs", []))
        logs.append(f"✗ Push failed: {error_str.splitlines()[0][:100]}")

        return {
            **state,
            "commit_count": commit_count,
            "push_succeeded": False,
            "current_step": "Push failed (auth/network error)",
            "error_message": error_str,
            "logs": logs,
        }
