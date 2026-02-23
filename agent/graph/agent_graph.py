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
    commit_message: str
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
    auto_commit: bool                 # If False, agent pauses before committing
    new_fix_count: int                # Number of new fixes generated in the last run_fixes node


# ─── Conditional Helpers ───

def _has_fixable_failures(state: dict) -> str:
    """After analysis, decide next node:
    - code failures found (exit 1)       → generate_fixes
    - tests PASSED (exit 0)              → route to commit or wait_for_approval based on auto_commit
    - config_fault (exit 4 or 5)         → apply_config_fix
    """
    exit_class = state.get("test_exit_class", "")

    # Immediate stop condition: if exit_code == 0, we passed locally.
    if exit_class == "PASSED":
        if state.get("auto_commit", False):
            print("[graph] ✅ All tests passed locally — proceeding to auto-commit")
            return "commit_and_push"
        else:
            print("[graph] ✅ All tests passed locally — pausing for user approval")
            return "wait_for_approval"

    failures = state.get("failures", [])

    if len(failures) == 0:
        if exit_class in ("COLLECTION_ERROR", "NO_TESTS_COLLECTED"):
            print("[graph] ⚙ Config/collection fault — routing to apply_config_fix")
            return "apply_config_fix"
        print("[graph] ⏭ Tests failed but no parseable failures — generating fixes anyway")
        return "generate_fixes"

    print("[graph] 🐛 Code failures found — routing to generate_fixes")
    return "generate_fixes"


def _after_config_fix(state: dict) -> str:
    """After apply_config_fix:
    - reinstall deps then run tests again
    """
    print("[graph] ✅ Config fix applied — reinstalling deps")
    return "reinstall_deps"


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
    logs.append("CI/CD check skipped — nothing was pushed")
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

def _wait_for_approval_node(state: dict) -> dict:
    """A dummy node that acts as a breakpoint for user confirmation."""
    logs = list(state.get("logs", []))
    logs.append("⏸ Paused: Awaiting user confirmation to commit.")
    # The actual pausing is handled by LangGraph's interrupt_before mechanism
    # When resumed, this node just passes state through to commit_and_push
    return {
        **state,
        "current_step": "Resuming after approval...",
        "logs": logs,
    }

# ─── Build the Graph ───
def build_agent_graph() -> StateGraph:
    """
    Construct the LangGraph StateGraph based on the new systematic workflow:
    1. Validate/Clone
    2. Install Deps
    3. Discover existing tests
    4. Generate missing tests (runs exactly once at the start)
    5. Local verification loop (run tests → fix code → run tests)
    6. Once local tests pass: wait for approval (if auto_commit=False) → commit → monitor CI/CD → finalize
    """
    graph = StateGraph(AgentState)

    # ── Nodes ──
    graph.add_node("clone_repo",        repo_clone_node)
    graph.add_node("install_deps",      dep_install_node)
    graph.add_node("discover_tests",    test_discovery_node)
    graph.add_node("generate_tests",    test_generator_node)
    graph.add_node("run_tests",         test_runner_node)
    graph.add_node("analyze_failures",  code_analysis_node)
    graph.add_node("apply_config_fix",  config_fix_node)
    graph.add_node("reinstall_deps",    _reinstall_deps_node)
    graph.add_node("generate_fixes",    fix_generator_node)
    graph.add_node("wait_for_approval", _wait_for_approval_node)
    graph.add_node("commit_and_push",   commit_node)
    graph.add_node("monitor_cicd",      cicd_monitor_node)
    graph.add_node("skip_cicd",         _skip_cicd_node)
    graph.add_node("retry_increment",   retry_increment_node)
    graph.add_node("finalize",          finalize_node)

    # ── Initial linear path ──
    graph.set_entry_point("clone_repo")
    graph.add_edge("clone_repo",       "install_deps")
    graph.add_edge("install_deps",     "discover_tests")
    graph.add_edge("discover_tests",   "generate_tests")   # ALWAYS generate tests first
    graph.add_edge("generate_tests",   "run_tests")

    graph.add_edge("run_tests",        "analyze_failures")

    # ── After analysis: local verify loop conditionals ──
    graph.add_conditional_edges(
        "analyze_failures",
        _has_fixable_failures,
        {
            "apply_config_fix": "apply_config_fix",
            "generate_fixes":   "generate_fixes",
            "commit_and_push":  "commit_and_push", # Proceed directly if auto_commit=True
            "wait_for_approval": "wait_for_approval", # Interrupt before this if auto_commit=False
        },
    )

    # ── Approval path ──
    graph.add_edge("wait_for_approval", "commit_and_push")

    # ── Config-fix path: fix → reinstall → run tests ──
    graph.add_conditional_edges(
        "apply_config_fix",
        _after_config_fix,
        {
            "reinstall_deps": "reinstall_deps",
        },
    )
    graph.add_edge("reinstall_deps", "run_tests")

    # ── Code-fix path: fix → retry local verifications loop ──
    graph.add_edge("generate_fixes", "retry_increment")
    
    graph.add_conditional_edges(
        "retry_increment",
        should_retry,
        {
            "run_tests": "run_tests",
            "finalize": "finalize",
            "commit_and_push": "commit_and_push",
            "wait_for_approval": "wait_for_approval",
        }
    )

    # ── After successful local verification → commit/CI ──
    graph.add_conditional_edges(
        "commit_and_push",
        _should_monitor_cicd,
        {
            "monitor_cicd": "monitor_cicd",
            "skip_cicd":    "skip_cicd",
        },
    )

    # ── Finalize ──
    graph.add_edge("monitor_cicd", "finalize")
    graph.add_edge("skip_cicd", "finalize")
    graph.add_edge("finalize", END)

    # Compile with interruption set *before* wait_for_approval
    # This ensures backend `astream` will `break` safely
    return graph
