"""Node 1.5: DependencyInstallAgent — Auto-install project dependencies."""

from tools.dep_installer import install_dependencies


def dep_install_node(state: dict) -> dict:
    """
    Detect and install project dependencies (requirements.txt, package.json, etc.)
    before running tests. This prevents false test failures from missing imports.
    """
    repo_path = state["repo_local_path"]

    print(f"[AGENT] installing dependencies for {repo_path}...")

    result = install_dependencies(repo_path)
    installed = result["installed"]
    message = result["message"]

    if installed:
        print(f"[AGENT] ✓ {message}")
    elif result["framework"] == "none":
        print(f"[AGENT] ⓘ No dependency file found — skipping")
    else:
        print(f"[AGENT] ✗ Install failed: {message}")

    logs = list(state.get("logs", []))
    if installed:
        logs.append(f"✓ Dependencies installed ({result['framework']})")
    elif result["framework"] != "none":
        logs.append(f"✗ Dependency install failed: {message[:100]}")

    return {
        **state,
        "current_step": "Installing dependencies...",
        "logs": logs,
    }
