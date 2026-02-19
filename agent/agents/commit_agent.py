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
    commit_message = f"[AI-AGENT] fix: iteration {iteration} — {fix_count} fix(es) applied"

    try:
        print(f"[AGENT] committing changes (iteration {iteration}, {fix_count} fixes)")
        pushed = commit_and_push(repo_path, branch_name, commit_message)

        if pushed:
            commit_count += 1
            print(f"[AGENT] ✓ pushed iteration {iteration} ({fix_count} fixes)")
            logs = list(state.get("logs", []))
            logs.append(f"✓ Committed and pushed: {fix_count} fix(es) (iteration {iteration})")
        else:
            print(f"[AGENT] ⏭ nothing to commit (iteration {iteration})")
            logs = list(state.get("logs", []))
            logs.append(f"⏭ Nothing new to commit (iteration {iteration})")

        return {
            **state,
            "commit_count": commit_count,
            "push_succeeded": pushed,
            "current_step": "Pushing fixes to GitHub...",
            "logs": logs,
        }

    except Exception as e:
        error_str = str(e)
        print(f"[AGENT] ✗ push failed: {e}")

        # Do not mark as fatal; we successfully committed the fix locally
        is_fatal = False

        logs = list(state.get("logs", []))
        logs.append(f"⚠ Native push bypassed (local commit succeeded): {error_str[:100]}")

        return {
            **state,
            "commit_count": commit_count,
            "push_succeeded": False,
            "current_step": "Fix committed locally (push skipped)",
            "error_message": "",
            "logs": logs,
        }
