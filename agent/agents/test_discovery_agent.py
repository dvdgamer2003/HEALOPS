"""Node 2: TestDiscoveryAgent — Auto-detect test framework and discover test files."""

from tools.test_runner_tools import detect_test_framework, discover_test_files


def test_discovery_node(state: dict) -> dict:
    """
    Detect the test framework (pytest/jest/vitest/mocha) and discover test files.

    When no framework is detected, sets test_framework to "unknown" instead of
    defaulting to pytest. Downstream steps (run_tests, test_generator) handle
    "unknown" gracefully — returning structured errors and skipping generation.
    """
    repo_path = state["repo_local_path"]

    framework = detect_test_framework(repo_path)
    if not framework:
        print("[AGENT] ⚠ no supported test framework detected — generating bootstrap tests...")
        from agents.test_generator_agent import test_generator_node
        state = test_generator_node(state)
        
        # Rerun framework detection after generation
        framework = detect_test_framework(repo_path)
        if not framework:
            framework = "unknown"

    test_files = discover_test_files(repo_path, framework)
    print(f"[AGENT] framework: {framework}, found {len(test_files)} test files")

    logs = list(state.get("logs", []))
    if framework == "unknown":
        logs.append("No test framework detected")
    logs.append(f"Test framework: {framework} | {len(test_files)} test file(s) found")

    return {
        **state,
        "test_framework": framework,
        "test_files": test_files,
        "current_step": "Discovering tests...",
        "logs": logs,
    }
