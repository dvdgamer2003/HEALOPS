import asyncio
import os
import certifi

from graph.agent_graph import build_agent_graph

async def main():
    import sys
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    os.environ["MONGODB_URI"] = os.getenv("MONGODB_URI") or ""
    # Provide a fake valid github token to bypass auth checks
    os.environ["GITHUB_TOKEN"] = "dummy_token"

    graph = build_agent_graph()
    app = graph.compile()

    state = {
        "run_id": "test_run_123",
        "github_url": "https://github.com/YASH-DHADGE/DEVDEMO",
        "github_token": "dummy_token",
        "branch_name": "TEST_PIPELINE",
        "commit_message": "Test commit",
        "repo_local_path": "",
        "test_framework": "pytest",
        "test_files": [],
        "test_results": [],
        "failures": [],
        "fixes_applied": [],
        "files_failed_before": [],
        "commit_count": 0,
        "push_succeeded": False,
        "iteration": 1,
        "ci_cd_timeline": [],
        "ci_cd_status": "PENDING",
        "start_time": 0.0,
        "end_time": 0.0,
        "current_step": "Init",
        "results": {},
        "error_message": "",
        "repo_cleaned": False,
        "logs": [],
        "test_exit_class": "",
        "generated_test_files": [],
        "config_fix_changed": False,
        "tests_generated": False,
        "no_diff_counts": {},
        "effective_repo_url": "",
        "auto_commit": True,
        "new_fix_count": 0,
    }

    try:
        async for output in app.astream(state):
            for node_name, node_state in output.items():
                print(f"\n--- Node: {node_name} ---")
                print(f"Current Step: {node_state.get('current_step')}")
                print(f"Test Exit Class: {node_state.get('test_exit_class')}")
                print(f"Generated Tests: {node_state.get('generated_test_files')}")
                print(f"Failures: {len(node_state.get('failures', []))}")
                print(f"Fixes Applied: {len(node_state.get('fixes_applied', []))}")
                print(f"Logs: {node_state.get('logs', [])[-1] if node_state.get('logs') else ''}")
    except Exception as e:
        print(f"Pipeline crashed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
