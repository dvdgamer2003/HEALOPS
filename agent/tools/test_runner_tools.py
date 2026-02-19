"""Test runner tools — detect and execute test suites using subprocess."""

import subprocess
import os
import sys
from typing import Optional


def detect_test_framework(repo_path: str) -> Optional[str]:
    """
    Auto-detect the test framework by scanning for config files and test directories.
    Returns: 'pytest' | 'jest' | 'vitest' | 'mocha' | None

    Returns None when no strong signal exists — callers must NOT default to pytest.
    """
    # Check for Python tests (pytest)
    if (
        os.path.exists(os.path.join(repo_path, "pytest.ini"))
        or os.path.exists(os.path.join(repo_path, "setup.cfg"))
        or any(
            os.path.basename(f).startswith("test_") or f.endswith("_test.py")
            for f in _walk_files(repo_path, ".py")
        )
    ):
        return "pytest"

    # Check for JS frameworks (Jest / Vitest / Mocha) via package.json
    pkg_json = os.path.join(repo_path, "package.json")
    if os.path.exists(pkg_json):
        try:
            import json
            with open(pkg_json, "r", encoding="utf-8") as f:
                pkg = json.load(f)
        except (json.JSONDecodeError, OSError):
            # Malformed or unreadable package.json — can't detect framework
            return None

        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        test_script = pkg.get("scripts", {}).get("test", "")

        # Vitest (check before Jest — vitest repos sometimes also have jest as transitive dep)
        if "vitest" in deps or "vitest" in test_script:
            return "vitest"

        if "jest" in deps or "jest" in test_script:
            return "jest"

        if "mocha" in deps:
            return "mocha"

    return None


def detect_js_test_framework(repo_path: str) -> Optional[str]:
    """
    Detect ONLY the JS/TS test framework from package.json.
    Returns 'jest' | 'vitest' | 'mocha' | None.
    Used by test_generator_agent to gate JS test generation.
    """
    pkg_json = os.path.join(repo_path, "package.json")
    if not os.path.exists(pkg_json):
        return None

    try:
        import json
        with open(pkg_json, "r", encoding="utf-8") as f:
            pkg = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None

    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    test_script = pkg.get("scripts", {}).get("test", "")

    if "vitest" in deps or "vitest" in test_script:
        return "vitest"
    if "jest" in deps or "jest" in test_script:
        return "jest"
    if "mocha" in deps:
        return "mocha"
    return None


def discover_test_files(repo_path: str, framework: str) -> list[str]:
    """Discover test files based on the framework conventions.

    Returns an empty list for unknown/unsupported frameworks.
    """
    test_files = []

    if framework == "pytest":
        for f in _walk_files(repo_path, ".py"):
            basename = os.path.basename(f)
            # Matches: test_*.py  *_test.py  tests.py (Django default)
            if (
                basename.startswith("test_")
                or basename.endswith("_test.py")
                or basename == "tests.py"
            ):
                test_files.append(os.path.relpath(f, repo_path))

    elif framework in ("jest", "vitest", "mocha"):
        for ext in (".js", ".ts", ".jsx", ".tsx"):
            for f in _walk_files(repo_path, ext):
                basename = os.path.basename(f)
                if ".test." in basename or ".spec." in basename or "/__tests__/" in f.replace("\\", "/"):
                    test_files.append(os.path.relpath(f, repo_path))

    # For "unknown" or None: return empty list (no crash)
    return test_files


def run_tests(repo_path: str, framework: str) -> dict:
    """
    Run the test suite and capture output.
    Returns: { 'returncode': int, 'stdout': str, 'stderr': str, 'passed': bool }

    For unknown/unsupported frameworks, returns a structured error without crashing.
    """
    # Use sys.executable to ensure we run in the correct venv
    # On Windows, npx needs the .cmd extension for subprocess to find it
    npx_exe = "npx.cmd" if sys.platform == "win32" else "npx"
    commands = {
        "pytest": [sys.executable, "-m", "pytest", "--tb=short", "-v"],
        "jest": [npx_exe, "jest", "--verbose", "--no-coverage"],
        "vitest": [npx_exe, "vitest", "run", "--reporter=verbose"],
        "mocha": [npx_exe, "mocha", "--recursive", "--reporter", "spec"],
    }

    cmd = commands.get(framework)
    if not cmd:
        return {
            "returncode": -1,
            "stdout": "",
            "stderr": f"Unknown or unsupported test framework: {framework}. "
                      "No test runner executed. Set up pytest (Python) or "
                      "jest/vitest/mocha (JS/TS) in the target repository.",
            "passed": False,
        }

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = repo_path

        result = subprocess.run(
            cmd,
            cwd=repo_path,
            env=env,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
        )
        return {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "passed": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {
            "returncode": -1,
            "stdout": "",
            "stderr": "Test execution timed out after 300 seconds",
            "passed": False,
        }
    except Exception as e:
        return {
            "returncode": -1,
            "stdout": "",
            "stderr": str(e),
            "passed": False,
        }


def _walk_files(root: str, extension: str) -> list[str]:
    """Walk a directory tree and return files matching the extension."""
    matches = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip common non-source directories
        dirnames[:] = [
            d for d in dirnames
            if d not in ("node_modules", ".git", "__pycache__", ".venv", "venv", ".tox", "dist", "build")
        ]
        for f in filenames:
            if f.endswith(extension):
                matches.append(os.path.join(dirpath, f))
    return matches
