"""Node 3: TestRunnerAgent — Execute tests and capture results."""

from tools.test_runner_tools import run_tests

# Map pytest/unittest exit codes to human-readable failure classes.
# This lets downstream nodes route correctly instead of treating all
# non-zero exits as "LOGIC" errors.
EXIT_CODE_CLASS = {
    0: "PASSED",
    1: "TESTS_FAILED",        # at least one test failed
    2: "INTERRUPTED",         # user interrupt / timeout
    3: "INTERNAL_ERROR",      # pytest internal error
    4: "COLLECTION_ERROR",    # import crash — likely config/env fault
    5: "NO_TESTS_COLLECTED",  # no test files found / 0 collected
}


def test_runner_node(state: dict) -> dict:
    """
    Run the full test suite and capture stdout/stderr.
    Updates state with test_results.
    """
    repo_path = state["repo_local_path"]
    framework = state.get("test_framework", "pytest")

    print(f"[AGENT] running {framework} tests (iteration {state.get('iteration', 1)})...")

    result = run_tests(repo_path, framework)

    test_results = [{
        "framework": framework,
        "passed": result["passed"],
        "returncode": result["returncode"],
        "stdout": result["stdout"][-3000:] if result["stdout"] else "",   # Truncate
        "stderr": result["stderr"][-3000:] if result["stderr"] else "",
    }]

    print(f"[AGENT] tests {'PASSED ✓' if result['passed'] else 'FAILED ✗'}")

    logs = list(state.get("logs", []))
    iteration = state.get("iteration", 1)
    rc = result.get("returncode", -1)
    exit_class = EXIT_CODE_CLASS.get(rc, f"UNKNOWN_EXIT_{rc}")

    if result["passed"]:
        logs.append(f"✓ Tests PASSED (iteration {iteration})")
    else:
        logs.append(f"✗ Tests FAILED (iteration {iteration}) — exit class: {exit_class}")
        # Surface stderr immediately so the cause is visible in the Activity Log
        stderr_excerpt = (result.get("stderr") or "")[:500].strip()
        if stderr_excerpt:
            logs.append(f"[stderr] {stderr_excerpt}")
        # Warn on actionable exit codes so the agent can branch correctly
        if exit_class == "COLLECTION_ERROR":
            logs.append("⚠ Exit 4: Collection error — likely missing DJANGO_SETTINGS_MODULE, pytest-django, or a bad import in test files")
        elif exit_class == "NO_TESTS_COLLECTED":
            logs.append("⚠ Exit 5: No tests collected — no test_*.py / tests.py files matched, or all were skipped")

    return {
        **state,
        "test_results": test_results,
        "test_exit_class": exit_class,
        "current_step": "Running tests...",
        "logs": logs,
    }
