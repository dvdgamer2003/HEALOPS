"""LangGraph StateGraph definition for the CI/CD Healing Agent.

Flow
────
  clone → install_deps → discover_tests → run_tests → analyze_failures
            ↓ (COLLECTION/NO_TESTS)
        apply_config_fix → reinstall_deps → generate_tests → commit → run_tests
            ↓ (TESTS_FAILED with failures)
        generate_fixes → commit → monitor_cicd → retry
            ↓ (PASSED / 0 failures)
        finalize
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END

from agents.repo_clone_agent import repo_clone_node
from agents.dep_install_agent import dep_install_node
from agents.test_discovery_agent import test_discovery_node
from agents.test_runner_agent import test_runner_node
from agents.test_generator_agent import test_generator_node
from agents.code_analysis_agent import code_analysis_node
from agents.config_fix_agent import config_fix_node
from agents.fix_generator_agent import fix_generator_node
from agents.commit_agent import commit_node
from agents.cicd_monitor_agent import cicd_monitor_node
from agents.retry_controller import should_retry, retry_increment_node, finalize_node


# ─── State Schema ───
class AgentState(TypedDict):
    run_id: str
    github_url: str
    team_name: str
    leader_name: str
    github_token: str
    branch_name: str
    repo_local_path: str
    test_framework: str
    test_files: list[str]
    test_results: list[dict]
    failures: list[dict]
    fixes_applied: list[dict]
    files_failed_before: list[str]
    commit_count: int
    push_succeeded: bool
    iteration: int
    ci_cd_timeline: list[dict]
    ci_cd_status: str
    start_time: float
    end_time: float
    current_step: str
    results: dict
    error_message: str
    repo_cleaned: bool
    logs: list[str]
    test_exit_class: str             # pytest exit code class
    generated_test_files: list[str]  # paths of AI-generated test files
    config_fix_changed: bool         # True if config_fix_agent wrote ≥1 new file
    tests_generated: bool            # True once test_generator_node has run
    no_diff_counts: dict             # per-file no-diff retry counter
    effective_repo_url: str           # The actual repo URL used (fork URL if forked, else github_url)
    forked_from: str                  # Original repo URL if the agent forked, else None


# ─── Conditional Helpers ───

def _has_fixable_failures(state: dict) -> str:
    """After analysis, decide next node:

    - code failures found (exit 1)       → generate_fixes
    - tests PASSED (exit 0)              → finalize
    - config_fault (exit 4 or 5)         → apply_config_fix
    """
    exit_class = state.get("test_exit_class", "")

    # Immediate stop condition: if exit_code == 0, we are done.
    if exit_class == "PASSED":
        print("[graph] ✅ All tests passed — finalizing")
        return "finalize"

    failures = state.get("failures", [])

    if len(failures) == 0:
        if exit_class in ("COLLECTION_ERROR", "NO_TESTS_COLLECTED"):
            print("[graph] ⚙ Config/collection fault — routing to apply_config_fix")
            return "apply_config_fix"
        # TESTS_FAILED but 0 extractable failures
        # If tests haven't been generated yet, route to config_fix path
        # (which leads to dep install → test generation → commit → re-run)
        if not state.get("tests_generated", False):
            print("[graph] ⚙ Tests failed, 0 parseable failures, tests not yet generated — routing to config_fix")
            return "apply_config_fix"
        print("[graph] ⏭ Tests failed but no parseable failures — finalizing")
        return "finalize"

    return "generate_fixes"


def _after_config_fix(state: dict) -> str:
    """After apply_config_fix:
    - wrote new files → reinstall deps then generate tests
    - nothing new BUT tests not generated → still need to reinstall + generate
    - nothing new AND tests already generated → finalize (avoid stalling)
    """
    changed = state.get("config_fix_changed", False)
    tests_generated = state.get("tests_generated", False)

    if changed:
        print("[graph] ✅ Config fix wrote new files — reinstalling deps")
        return "reinstall_deps"
    if not tests_generated:
        print("[graph] ℹ Config already done, but tests not generated yet — reinstalling deps")
        return "reinstall_deps"
    print("[graph] ⏭ Config fix has nothing new and tests already generated — finalizing")
    return "finalize"


def _should_generate_tests(state: dict) -> str:
    """After reinstalling deps, generate tests if not already done."""
    if state.get("tests_generated", False):
        print("[graph] ℹ Tests already generated — skipping to commit")
        return "commit_and_push"
    print("[graph] 🤖 Generating tests for uncovered source files")
    return "generate_tests"


def _should_monitor_cicd(state: dict) -> str:
    """Skip CI/CD monitoring if nothing was pushed."""
    if state.get("push_succeeded", False):
        return "monitor_cicd"
    return "skip_cicd"


def _skip_cicd_node(state: dict) -> dict:
    """Lightweight node that records a skipped CI/CD check."""
    from datetime import datetime, timezone

    iteration = state.get("iteration", 1)
    timeline = list(state.get("ci_cd_timeline", []))
    timeline.append({
        "iteration": iteration,
        "status": "SKIPPED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "No push — CI/CD check skipped",
    })
    logs = list(state.get("logs", []))
    logs.append(f"⏭ Skipped CI/CD monitoring (no new push)")
    print(f"[graph] ⏭ Skipping CI/CD monitor — nothing was pushed")

    return {
        **state,
        "ci_cd_status": "FAILED",
        "ci_cd_timeline": timeline,
        "current_step": "Skipped CI/CD (no changes pushed)",
        "logs": logs,
    }


def _reinstall_deps_node(state: dict) -> dict:
    """Re-run dependency installation after config_fix patches requirements.txt."""
    from tools.dep_installer import install_dependencies

    repo_path = state["repo_local_path"]
    logs = list(state.get("logs", []))

    print("[graph] 📦 Reinstalling deps after config fix...")
    result = install_dependencies(repo_path)

    if result["installed"]:
        logs.append(f"✓ Deps reinstalled ({result['framework']})")
        print(f"[graph] ✓ Deps reinstalled ({result['framework']})")
    else:
        logs.append(f"ℹ Deps reinstall: {result['message'][:100]}")
        print(f"[graph] ℹ Deps reinstall: {result['message'][:80]}")

    return {
        **state,
        "current_step": "Reinstalling dependencies...",
        "logs": logs,
    }


# ─── Build the Graph ───
def build_agent_graph() -> StateGraph:
    """
    Construct the LangGraph StateGraph.

    Initial path (first run):
      clone → install_deps → discover_tests → run_tests → analyze

    Config-fault path (exit 4/5):
      analyze → config_fix → reinstall_deps → [generate_tests →] commit → run_tests → ...

    Code-fix path (exit 1 with failures):
      analyze → generate_fixes → commit → monitor/skip_cicd → retry/finalize

    Passed/unresolvable:
      analyze → finalize
    """
    graph = StateGraph(AgentState)

    # ── Nodes ──
    graph.add_node("clone_repo",        repo_clone_node)
    graph.add_node("install_deps",      dep_install_node)
    graph.add_node("discover_tests",    test_discovery_node)
    graph.add_node("run_tests",         test_runner_node)
    graph.add_node("analyze_failures",  code_analysis_node)
    graph.add_node("apply_config_fix",  config_fix_node)
    graph.add_node("reinstall_deps",    _reinstall_deps_node)
    graph.add_node("generate_tests",    test_generator_node)
    graph.add_node("generate_fixes",    fix_generator_node)
    graph.add_node("commit_and_push",   commit_node)
    graph.add_node("monitor_cicd",      cicd_monitor_node)
    graph.add_node("skip_cicd",         _skip_cicd_node)
    graph.add_node("retry_increment",   retry_increment_node)
    graph.add_node("finalize",          finalize_node)

    # ── Initial linear path ──
    graph.set_entry_point("clone_repo")
    graph.add_edge("clone_repo",       "install_deps")
    graph.add_edge("install_deps",     "discover_tests")
    graph.add_edge("discover_tests",   "run_tests")        # run tests first to detect config issues
    graph.add_edge("run_tests",        "analyze_failures")

    # ── After analysis: config fault / code failure / passed ──
    graph.add_conditional_edges(
        "analyze_failures",
        _has_fixable_failures,
        {
            "apply_config_fix": "apply_config_fix",
            "generate_fixes":   "generate_fixes",
            "finalize":         "finalize",
        },
    )

    # ── Config-fix path: fix → reinstall → maybe generate tests → commit ──
    graph.add_conditional_edges(
        "apply_config_fix",
        _after_config_fix,
        {
            "reinstall_deps": "reinstall_deps",
            "finalize":       "finalize",
        },
    )

    graph.add_conditional_edges(
        "reinstall_deps",
        _should_generate_tests,
        {
            "generate_tests": "generate_tests",
            "commit_and_push": "commit_and_push",
        },
    )

    graph.add_edge("generate_tests",   "commit_and_push")

    # ── Code-fix path: fix → commit ──
    graph.add_edge("generate_fixes",   "commit_and_push")

    # ── After commit: monitor CI/CD or skip ──
    graph.add_conditional_edges(
        "commit_and_push",
        _should_monitor_cicd,
        {
            "monitor_cicd": "monitor_cicd",
            "skip_cicd":    "skip_cicd",
        },
    )

    # ── After CI/CD: retry or finalize ──
    graph.add_conditional_edges(
        "monitor_cicd",
        should_retry,
        {
            "run_tests": "retry_increment",
            "finalize":  "finalize",
        },
    )

    graph.add_conditional_edges(
        "skip_cicd",
        should_retry,
        {
            "run_tests": "retry_increment",
            "finalize":  "finalize",
        },
    )

    graph.add_edge("retry_increment", "run_tests")

    # ── Finalize → END ──
    graph.add_edge("finalize", END)

    return graph.compile()


# Singleton compiled graph
agent_graph = build_agent_graph()
