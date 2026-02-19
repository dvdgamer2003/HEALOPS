"""Node 4: CodeAnalysisAgent — Parse failures and identify files, lines, and bug types."""

import os
import re
from tools.openrouter_tools import analyze_error

# Files that are typically config/environment — Gemini can't fix these
UNFIXABLE_PATTERNS = {
    "manage.py", "wsgi.py", "asgi.py", "settings.py",
    "conftest.py", "setup.py", "setup.cfg", "__init__.py",
    # JS/TS build & lint config files — not application code
    "eslint.config.js", "eslint.config.ts", ".eslintrc.js", ".eslintrc.cjs",
    "postcss.config.js", "postcss.config.cjs",
    "tailwind.config.js", "tailwind.config.ts",
    "vite.config.js", "vite.config.ts",
    "vite-env.d.ts",
    "jest.config.js", "jest.config.ts", "jest.setup.js",
    "next.config.js", "next.config.mjs", "next.config.ts",
    "webpack.config.js", "babel.config.js", ".babelrc.js",
    "tsconfig.json", "tsconfig.node.json",
}

# Substrings in file paths that indicate config/env files
UNFIXABLE_PATH_HINTS = ["migrations/", "apps.py", "admin.py"]

# Signals that indicate a pytest COLLECTION or CONFIG failure.
# When any are present in stderr, the root cause is NOT app-code logic;
# Gemini should not be tasked with editing source files.
CONFIG_FAULT_SIGNALS = [
    "ImproperlyConfigured",
    "DJANGO_SETTINGS_MODULE",
    "django.core.exceptions",
    "No module named",
    "ModuleNotFoundError",
    "ImportError",
    "no tests ran",
    "no tests were selected",
    "collected 0 items",
]


def _is_config_fault(error_output: str) -> bool:
    """Return True when stderr/stdout indicates a config/import issue rather than a code bug."""
    return any(sig.lower() in error_output.lower() for sig in CONFIG_FAULT_SIGNALS)


def _is_unfixable(file_path: str) -> bool:
    """Return True if a file is likely a config/environment file that Gemini can't fix."""
    basename = os.path.basename(file_path)
    if basename in UNFIXABLE_PATTERNS:
        return True
    normalized = file_path.replace("\\", "/")
    return any(hint in normalized for hint in UNFIXABLE_PATH_HINTS)


def code_analysis_node(state: dict) -> dict:
    """
    Analyze test failures to identify failing files, line numbers, and bug types.
    Skips unfixable config/environment files to save Gemini API calls.
    Short-circuits early if the error is a config/import fault (exit 4 or 5),
    so the agent does not waste iterations on irrelevant LOGIC-line-1 placeholders.
    """
    repo_path = state["repo_local_path"]
    test_results = state.get("test_results", [])
    exit_class = state.get("test_exit_class", "")

    # ── Config-fault short-circuit ──────────────────────────────────────────
    # Only short-circuit when pytest ITSELF could not collect tests (exit 4/5).
    # When exit_class is TESTS_FAILED (exit 1), pytest collected AND ran tests
    # — any ImportError/ModuleNotFoundError in stderr is from test code (fixable
    #   by Gemini), NOT from missing config.  Do NOT skip analysis in that case.
    if exit_class in ("COLLECTION_ERROR", "NO_TESTS_COLLECTED"):
        logs = list(state.get("logs", []))
        logs.append(
            "⚠ Config/collection fault detected (exit class: {}) — skipping Gemini file-fix. "
            "Root cause is likely: missing pytest.ini, DJANGO_SETTINGS_MODULE not set, "
            "or pytest-django not installed.".format(exit_class)
        )
        print(f"[AGENT] analyzing failures — config fault ({exit_class}), returning 0 failures")
        return {
            **state,
            "failures": [],
            "current_step": "Config/collection fault detected — no code fix possible",
            "logs": logs,
        }
    # ────────────────────────────────────────────────────────────────────────


    failures = []
    skipped_count = 0

    for result in test_results:
        if result["passed"]:
            continue

        # Combine stdout and stderr for analysis
        error_output = f"{result.get('stdout', '')}\\n{result.get('stderr', '')}"

        # Try to extract failing files from the error output
        failing_files = _extract_failing_files(error_output, repo_path)

        # Deduplicate: track files already processed in this iteration
        seen_files = set()
        for file_path in failing_files:
            if file_path in seen_files:
                continue
            seen_files.add(file_path)

            # Skip unfixable config/environment files
            if _is_unfixable(file_path):
                skipped_count += 1
                print(f"[AGENT] ⏭ skipping unfixable file: {file_path}")
                continue

            full_path = os.path.join(repo_path, file_path)
            if os.path.exists(full_path):
                with open(full_path, "r", errors="replace") as f:
                    file_content = f.read()

                analysis = analyze_error(error_output, file_content)
                failures.append({
                    "file": file_path,
                    "line_number": analysis.get("line_number", 1),
                    "bug_type": analysis.get("bug_type", "LOGIC"),
                    "error_message": analysis.get("description", "Unknown error"),
                    "fix_instruction": analysis.get("fix_instruction", ""),
                    "error_output": error_output[:2000],
                })

    print(f"[AGENT] analyzing failures — {len(failures)} fixable, {skipped_count} config files skipped")

    logs = list(state.get("logs", []))
    if skipped_count:
        logs.append(f"⏭ Skipped {skipped_count} unfixable config file(s)")
    logs.append(f"Identified {len(failures)} fixable failure(s)")

    return {
        **state,
        "failures": failures,
        "current_step": "Analyzing failures...",
        "logs": logs,
    }


def _extract_failing_files(error_output: str, repo_path: str) -> list[str]:
    """Extract file paths from error output using pattern matching."""
    files = set()

    def _is_valid_source_file(rel_path: str) -> bool:
        if rel_path.startswith(".."): return False
        if not os.path.exists(os.path.join(repo_path, rel_path)): return False
        name = os.path.basename(rel_path).lower()
        if name.startswith("test") or name.endswith(("_test.py", ".test.js", ".spec.js", ".test.ts", ".spec.ts")):
            return False
        if "tests/" in rel_path.lower() or "test/" in rel_path.lower():
            return False
        return True

    # Common patterns: "File 'path/to/file.py', line X" (Python)
    py_pattern = re.findall(r"File ['\"](.+?)['\"],\s*line\s*\d+", error_output)
    for match in py_pattern:
        rel = os.path.relpath(match, repo_path) if os.path.isabs(match) else match
        if _is_valid_source_file(rel):
            files.add(rel)

    # JS/TS patterns: "at ... (path/to/file.js:line:col)"
    js_pattern = re.findall(r"at\s+.*?\((.+?):\d+:\d+\)", error_output)
    for match in js_pattern:
        rel = os.path.relpath(match, repo_path) if os.path.isabs(match) else match
        if _is_valid_source_file(rel):
            files.add(rel)

    # Generic: look for file extensions
    generic = re.findall(r"([\w/\\.-]+\.(?:py|js|ts|jsx|tsx))", error_output)
    for match in generic:
        rel = match.replace("\\", "/")
        if _is_valid_source_file(rel):
            files.add(rel)

    return list(files) if files else _guess_source_files(repo_path)


def _guess_source_files(repo_path: str) -> list[str]:
    """Fallback: return main source files if we can't parse the error."""
    src_files = []
    skip_dirs = {"node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build", ".next"}
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            # Skip test files, declaration files, and all known config files
            if f.startswith("test") or f.endswith(".d.ts"):
                continue
            if f in UNFIXABLE_PATTERNS:
                continue
            if f.endswith((".py", ".js", ".ts", ".jsx", ".tsx")):
                rel = os.path.relpath(os.path.join(root, f), repo_path)
                src_files.append(rel)
                if len(src_files) >= 5:
                    return src_files
    return src_files
