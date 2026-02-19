"""Dependency installer — auto-detect and install project dependencies before testing."""

import os
import subprocess
import sys


def install_dependencies(repo_path: str) -> dict:
    """
    Auto-detect and install project dependencies.
    Supports: requirements.txt, setup.py, pyproject.toml (Python)
              package.json (Node.js)
    Returns: { 'installed': bool, 'framework': str, 'message': str }
    """
    results = []

    # ── Python dependencies ──
    req_txt = os.path.join(repo_path, "requirements.txt")
    setup_py = os.path.join(repo_path, "setup.py")
    pyproject = os.path.join(repo_path, "pyproject.toml")

    if os.path.exists(req_txt):
        ok, msg = _run_install(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q", "--disable-pip-version-check"],
            repo_path,
        )
        results.append(("requirements.txt", ok, msg))

    elif os.path.exists(setup_py):
        ok, msg = _run_install(
            [sys.executable, "-m", "pip", "install", "-e", ".", "-q", "--disable-pip-version-check"],
            repo_path,
        )
        results.append(("setup.py", ok, msg))

    elif os.path.exists(pyproject):
        # Check if it's a Poetry project (has [tool.poetry] section)
        is_poetry = _is_poetry_project(pyproject)
        if is_poetry:
            poetry_exe = "poetry.cmd" if sys.platform == "win32" else "poetry"
            ok, msg = _run_install([poetry_exe, "install", "--no-interaction"], repo_path)
            results.append(("pyproject.toml (poetry)", ok, msg))
        else:
            ok, msg = _run_install(
                [sys.executable, "-m", "pip", "install", "-e", ".", "-q", "--disable-pip-version-check"],
                repo_path,
            )
            results.append(("pyproject.toml", ok, msg))

    # ── Node.js dependencies ──
    pkg_json = os.path.join(repo_path, "package.json")
    if os.path.exists(pkg_json):
        # On Windows, subprocess cannot find 'npm' without the .cmd extension
        npm_exe = "npm.cmd" if sys.platform == "win32" else "npm"
        # Prefer npm ci for reproducible installs, fall back to npm install
        lock_file = os.path.join(repo_path, "package-lock.json")
        cmd = [npm_exe, "ci", "--silent"] if os.path.exists(lock_file) else [npm_exe, "install", "--silent"]
        ok, msg = _run_install(cmd, repo_path)
        results.append(("package.json", ok, msg))

    if not results:
        return {
            "installed": False,
            "framework": "none",
            "message": "No dependency file found (requirements.txt, setup.py, pyproject.toml, package.json)",
        }

    installed = all(ok for _, ok, _ in results)
    frameworks = ", ".join(f for f, _, _ in results)
    messages = "; ".join(f"{f}: {m}" for f, _, m in results)

    # Ensure pytest exists for Python projects
    _run_install(
        [sys.executable, "-m", "pip", "install", "pytest", "-q"],
        repo_path,
    )

    return {
        "installed": installed,
        "framework": frameworks,
        "message": messages if not installed else f"Installed from {frameworks}",
    }


def _is_poetry_project(pyproject_path: str) -> bool:
    """Check if a pyproject.toml is a Poetry project."""
    try:
        with open(pyproject_path, "r", encoding="utf-8") as f:
            content = f.read()
        return "[tool.poetry]" in content
    except Exception:
        return False


def _run_install(cmd: list[str], cwd: str) -> tuple[bool, str]:
    """Run an install command and return (success, message)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
        )
        if result.returncode == 0:
            return True, "OK"
        else:
            error = result.stderr[-300:] if result.stderr else result.stdout[-300:]
            return False, f"Exit {result.returncode}: {error}"
    except subprocess.TimeoutExpired:
        return False, "Timed out after 120s"
    except Exception as e:
        return False, str(e)[:200]
