"""Node 2b: TestGeneratorAgent — AI-powered test case generation.

Fires *after* test discovery (N2). For every source file that does NOT already
have a corresponding test file, Gemini generates a complete, runnable test file
and writes it to the repo. The newly-created files are tracked in state so
commit_agent can include them in the AI-fix branch.

Generation strategy
───────────────────
1. Walk source files (*.py / *.js / *.ts) — skipping known non-testable files.
2. Check whether a corresponding test file already exists (same name, test_ prefix
   or _test suffix, or inside a tests/ directory).
3. For each uncovered file (cap: MAX_FILES_TO_GENERATE):
   a. Read the source.
   b. Call Gemini to generate a complete test file.
   c. Write the test file alongside the source (or in a tests/ dir for JS).
4. Return updated state with generated_test_files list.

JS test gating
──────────────
JS/TS test generation only runs when the target repo explicitly has Jest or
Vitest in its package.json. Without a supported JS test framework, JS source
files are skipped with a log message.

Repair-on-retry
───────────────
On iteration > 1, instead of skipping entirely, the agent checks if any
failures reference generated test files. If so, it re-generates only those
failing test files. Otherwise, it skips generation as before.
"""

import os
import re

from tools.openrouter_tools import generate_tests
from tools.test_runner_tools import detect_js_test_framework


# ─── Config ───────────────────────────────────────────────────────────────────

# Maximum number of source files to generate tests for in one iteration.
# Keeps API costs predictable — raise or lower as needed.
MAX_FILES_TO_GENERATE = 5

# Source files that are never testable by design.
SKIP_SOURCE_PATTERNS = {
    "manage.py", "wsgi.py", "asgi.py", "settings.py",
    "conftest.py", "setup.py", "apps.py", "admin.py",
    "__init__.py", "migrations",
}

# Minimum source-file size to bother generating tests for (bytes).
# Tiny files (empty stubs, single-line constants) are skipped.
MIN_SOURCE_BYTES = 200

# ALL extensions we ever look at — we collect both Python and JS in every repo.
ALL_SOURCE_EXTENSIONS = (".py", ".js", ".ts", ".jsx", ".tsx")

JS_EXTENSIONS = {".js", ".ts", ".jsx", ".tsx"}
PY_EXTENSIONS = {".py"}

# JS files that are config / bundler artefacts — not logic worth testing.
SKIP_JS_PATTERNS = {
    "vite.config.js", "vite.config.ts",
    "webpack.config.js", "rollup.config.js",
    "babel.config.js", "jest.config.js", "jest.config.ts",
    "tailwind.config.js", "postcss.config.js",
    "next.config.js", "next.config.ts",
    ".eslintrc.js", ".prettierrc.js",
    "index.js",  # usually just re-exports
}

# JS frameworks that we can generate tests for.
SUPPORTED_JS_FRAMEWORKS = {"jest", "vitest"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_skippable(rel_path: str) -> bool:
    """Return True for config/boilerplate files that shouldn't be tested."""
    parts = rel_path.replace("\\", "/").split("/")
    for part in parts:
        if part in SKIP_SOURCE_PATTERNS or part.startswith("migration"):
            return True
    basename = os.path.basename(rel_path)
    _, ext = os.path.splitext(basename)
    if ext in JS_EXTENSIONS and basename in SKIP_JS_PATTERNS:
        return True
    return basename in SKIP_SOURCE_PATTERNS


def _file_framework(
    rel_source: str,
    primary_framework: str,
    is_django: bool,
    js_framework: str | None,
) -> tuple[str | None, bool]:
    """Return (framework_for_this_file, is_django_for_this_file).

    JS/TS files: returns the detected JS framework (jest/vitest) or None
    if no supported JS test runner was detected for the repo.
    Python files: returns 'pytest' with Django flag.
    """
    _, ext = os.path.splitext(rel_source)
    if ext in JS_EXTENSIONS:
        if js_framework and js_framework in SUPPORTED_JS_FRAMEWORKS:
            return js_framework, False
        # No supported JS framework → skip this file
        return None, False
    # Python file
    return "pytest", is_django


def _find_source_files(repo_path: str, extensions: tuple) -> list[str]:
    """Walk the repo and collect source files with the given extensions."""
    sources = []
    for dirpath, dirnames, filenames in os.walk(repo_path):
        # Prune non-source directories
        dirnames[:] = [
            d for d in dirnames
            if d not in ("node_modules", ".git", "__pycache__", ".venv",
                         "venv", ".tox", "dist", "build", "static", "templates",
                         "migrations", "media")
        ]
        for fname in filenames:
            if fname.endswith(extensions):
                full = os.path.join(dirpath, fname)
                rel = os.path.relpath(full, repo_path)
                if not _is_skippable(rel) and os.path.getsize(full) >= MIN_SOURCE_BYTES:
                    sources.append(rel)
    return sources


def _already_has_test(rel_source: str, existing_test_files: set[str], repo_path: str) -> bool:
    """Return True if a test file already exists for this source file."""
    dirname = os.path.dirname(rel_source)
    basename = os.path.basename(rel_source)
    stem, ext = os.path.splitext(basename)

    # Python naming conventions
    candidates = [
        os.path.join(dirname, f"test_{stem}{ext}"),
        os.path.join(dirname, f"{stem}_test{ext}"),
        os.path.join(dirname, "tests.py"),
        os.path.join(dirname, "tests", f"test_{stem}{ext}"),
        os.path.join("tests", f"test_{stem}{ext}"),
        os.path.join("tests", dirname, f"test_{stem}{ext}"),
    ]
    # JS / TS naming conventions
    if ext in JS_EXTENSIONS:
        candidates += _js_test_candidates(rel_source)

    for candidate in candidates:
        norm = candidate.replace("\\", "/")
        if any(norm in tf.replace("\\", "/") for tf in existing_test_files):
            return True
        if os.path.exists(os.path.join(repo_path, candidate)):
            return True
    return False


def _target_test_path(rel_source: str) -> str:
    """Compute where the generated test file should be written.

    Python: alongside the source as `test_<stem>.py`
    JS/TS:  a `__tests__/` sibling directory (Jest/Vitest convention)
    """
    dirname = os.path.dirname(rel_source)
    basename = os.path.basename(rel_source)
    stem, ext = os.path.splitext(basename)

    if ext in (".js", ".ts", ".jsx", ".tsx"):
        return os.path.join(dirname, "__tests__", f"{stem}.test{ext}")
    # Python
    return os.path.join(dirname, f"test_{stem}.py")


def _detect_django(repo_path: str) -> tuple[bool, str]:
    """Return (is_django, settings_module) by checking for manage.py."""
    if not os.path.exists(os.path.join(repo_path, "manage.py")):
        return False, ""
    # Try to infer the settings package (same logic as config_fix_agent)
    for entry in os.listdir(repo_path):
        pkg_dir = os.path.join(repo_path, entry)
        if (
            os.path.isdir(pkg_dir)
            and os.path.exists(os.path.join(pkg_dir, "settings.py"))
        ):
            return True, f"{entry}.settings"
    return True, "settings"


def _js_test_candidates(rel_source: str) -> list[str]:
    """Additional test-file naming patterns for JS/TS files."""
    dirname = os.path.dirname(rel_source)
    basename = os.path.basename(rel_source)
    stem, ext = os.path.splitext(basename)
    return [
        os.path.join(dirname, "__tests__", f"{stem}.test{ext}"),
        os.path.join(dirname, "__tests__", f"{stem}.spec{ext}"),
        os.path.join(dirname, f"{stem}.test{ext}"),
        os.path.join(dirname, f"{stem}.spec{ext}"),
    ]


def _find_failing_generated_tests(state: dict) -> list[str]:
    """Return generated test file paths that appear in current failures."""
    generated = set(state.get("generated_test_files", []))
    if not generated:
        return []

    failures = state.get("failures", [])
    failing_generated = []
    for f in failures:
        fpath = f.get("file", "")
        # Normalize to forward-slash for comparison
        fpath_norm = fpath.replace("\\", "/")
        for gen in generated:
            gen_norm = gen.replace("\\", "/")
            if gen_norm == fpath_norm or gen_norm in fpath_norm:
                failing_generated.append(gen)
                break
    return failing_generated


# ─── Main node ────────────────────────────────────────────────────────────────

def test_generator_node(state: dict) -> dict:
    """
    Generate test files for source files that lack them.

    Iteration 1: generate new tests for uncovered source files.
    Iteration > 1: repair only generated tests that are failing (if any).

    JS/TS test generation is gated — only runs when the repo has jest or
    vitest in its package.json dependencies. Otherwise JS files are skipped.

    Updates state with:
      - test_files:             extended with newly created test paths
      - generated_test_files:   list of relative paths written this run
      - fixes_applied:          each generated file recorded as a fix
      - logs:                   progress messages
    """
    repo_path = state["repo_local_path"]
    framework = state.get("test_framework", "pytest")
    existing_tests = set(state.get("test_files", []))
    fixes_applied = list(state.get("fixes_applied", []))
    logs = list(state.get("logs", []))
    iteration = state.get("iteration", 1)

    # ── Repair-on-retry path ──────────────────────────────────────────────────
    if iteration > 1:
        return _repair_generated_tests(state, repo_path, fixes_applied, logs)

    # ── Detect Django ──────────────────────────────────────────────────────────
    is_django, settings_module = _detect_django(repo_path)
    if is_django:
        logs.append(f"🔍 Django project detected (settings: {settings_module})")
        print(f"[AGENT] Django project: {settings_module}")

    # ── Detect JS test framework for gating ───────────────────────────────────
    js_framework = detect_js_test_framework(repo_path)
    if js_framework:
        print(f"[AGENT] JS test framework detected: {js_framework}")
    else:
        print("[AGENT] no JS test framework detected — JS test generation will be skipped")

    # ── Find ALL source files (Python + JS/TS) without tests ──────────────────
    source_files = _find_source_files(repo_path, ALL_SOURCE_EXTENSIONS)
    uncovered = [
        f for f in source_files
        if not _already_has_test(f, existing_tests, repo_path)
    ]

    py_count = sum(1 for f in source_files if f.endswith(".py"))
    js_count = len(source_files) - py_count
    print(f"[AGENT] {len(source_files)} source file(s) "
          f"(Python: {py_count}, JS/TS: {js_count}), "
          f"{len(uncovered)} uncovered, will generate up to {MAX_FILES_TO_GENERATE}")
    logs.append(f"🔍 Found {len(source_files)} source file(s) "
                f"(🐍 Python: {py_count}  📜 JS/TS: {js_count}) — "
                f"{len(uncovered)} without tests")

    if not uncovered:
        logs.append("✓ All source files already have corresponding tests")
        return {**state, "logs": logs, "tests_generated": True}

    logs.append(f"🤖 Generating tests for {min(len(uncovered), MAX_FILES_TO_GENERATE)} "
                f"of {len(uncovered)} uncovered source file(s)…")

    generated_test_files = list(state.get("generated_test_files", []))
    new_test_paths = []
    success_count = 0
    fail_count = 0
    js_skipped = 0

    for rel_source in uncovered[:MAX_FILES_TO_GENERATE]:
        full_source = os.path.join(repo_path, rel_source)

        try:
            with open(full_source, "r", errors="replace") as fh:
                source_code = fh.read()
        except OSError as e:
            print(f"[AGENT] cannot read {rel_source}: {e}")
            fail_count += 1
            continue

        # Determine the correct framework per file extension (gated for JS)
        file_fw, file_is_django = _file_framework(rel_source, framework, is_django, js_framework)

        # Skip JS files when no supported JS framework is available
        if file_fw is None:
            js_skipped += 1
            print(f"[AGENT] ⏭ skipping JS test generation for {rel_source} (no jest/vitest detected)")
            logs.append(f"  ⏭ Skipped {rel_source} (no JS test framework in repo)")
            continue

        print(f"[AGENT] generating {file_fw} tests for: {rel_source}")

        # Call Gemini with per-file framework
        test_code = generate_tests(
            source_code=source_code,
            file_path=rel_source,
            framework=file_fw,
            is_django=file_is_django,
            settings_module=settings_module if file_is_django else "",
        )

        if not test_code or len(test_code.strip()) < 50:
            print(f"[AGENT] ✗ empty/too-short response for {rel_source}")
            logs.append(f"  ✗ Skipped {rel_source} (Gemini returned empty test)")
            fail_count += 1
            continue

        # Determine output path and write
        rel_test_path = _target_test_path(rel_source)
        full_test_path = os.path.join(repo_path, rel_test_path)
        os.makedirs(os.path.dirname(full_test_path), exist_ok=True)

        with open(full_test_path, "w", encoding="utf-8") as fh:
            fh.write(test_code)

        print(f"[AGENT] ✓ written: {rel_test_path}")
        logs.append(f"  ✓ Generated {rel_test_path}")

        new_test_paths.append(rel_test_path)
        generated_test_files.append(rel_test_path)

        fixes_applied.append({
            "file": rel_test_path,
            "bug_type": "GENERATED_TEST",
            "line_number": 0,
            "commit_message": f"[AI-AGENT] test: generate tests for {rel_source}",
            "status": "Generated",
        })
        success_count += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = (
        f"🤖 Test generation complete: {success_count} file(s) created"
        + (f", {fail_count} skipped" if fail_count else "")
        + (f", {js_skipped} JS skipped (no framework)" if js_skipped else "")
    )
    logs.append(summary)
    print(f"[AGENT] {summary}")

    return {
        **state,
        "test_files": list(existing_tests) + new_test_paths,
        "generated_test_files": generated_test_files,
        "fixes_applied": fixes_applied,
        "tests_generated": True,
        "current_step": "Generating test cases…",
        "logs": logs,
    }


def _repair_generated_tests(state: dict, repo_path: str,
                             fixes_applied: list, logs: list) -> dict:
    """Repair AI-generated test files that are failing on iteration > 1.

    Only re-generates tests that:
    1. Were created by this agent (tracked in generated_test_files)
    2. Are referenced in the current failures list

    If no generated tests are failing, skips entirely.
    """
    failing_gen = _find_failing_generated_tests(state)

    if not failing_gen:
        logs.append("ℹ Test generation skipped (iteration > 1, no failing generated tests)")
        return {**state, "logs": logs}

    logs.append(f"🔧 Repairing {len(failing_gen)} failing generated test file(s)…")
    print(f"[AGENT] repairing {len(failing_gen)} failing generated test(s)")

    generated_test_files = list(state.get("generated_test_files", []))
    repaired = 0

    for rel_test in failing_gen:
        full_test = os.path.join(repo_path, rel_test)
        if not os.path.exists(full_test):
            continue

        # Find the original source file for this test
        rel_source = _infer_source_from_test(rel_test)
        full_source = os.path.join(repo_path, rel_source)
        if not os.path.exists(full_source):
            logs.append(f"  ⏭ Cannot find source for {rel_test} — skipping repair")
            continue

        try:
            with open(full_source, "r", errors="replace") as fh:
                source_code = fh.read()
        except OSError:
            continue

        # Determine framework from extension
        _, ext = os.path.splitext(rel_source)
        file_fw = "jest" if ext in JS_EXTENSIONS else "pytest"

        is_django, settings_module = _detect_django(repo_path)
        file_is_django = is_django and ext == ".py"

        print(f"[AGENT] re-generating {file_fw} tests for: {rel_source}")
        test_code = generate_tests(
            source_code=source_code,
            file_path=rel_source,
            framework=file_fw,
            is_django=file_is_django,
            settings_module=settings_module if file_is_django else "",
        )

        if test_code and len(test_code.strip()) >= 50:
            with open(full_test, "w", encoding="utf-8") as fh:
                fh.write(test_code)
            repaired += 1
            fixes_applied.append({
                "file": rel_test,
                "bug_type": "GENERATED_TEST",
                "line_number": 0,
                "commit_message": f"[AI-AGENT] test: repair failing tests for {rel_source}",
                "status": "Fixed",
            })
            logs.append(f"  ✓ Repaired {rel_test}")
            print(f"[AGENT] ✓ repaired: {rel_test}")
        else:
            logs.append(f"  ✗ Repair failed for {rel_test}")

    logs.append(f"🔧 Repair complete: {repaired}/{len(failing_gen)} test file(s) fixed")
    return {
        **state,
        "fixes_applied": fixes_applied,
        "generated_test_files": generated_test_files,
        "current_step": "Repairing generated tests…",
        "logs": logs,
    }


def _infer_source_from_test(rel_test: str) -> str:
    """Given a generated test path, infer the original source file path.

    test_foo.py         → foo.py
    __tests__/foo.test.js → foo.js
    """
    dirname = os.path.dirname(rel_test)
    basename = os.path.basename(rel_test)
    stem, ext = os.path.splitext(basename)

    # Python: test_<stem>.py → <stem>.py
    if basename.startswith("test_") and ext == ".py":
        source_name = basename[5:]  # strip "test_"
        return os.path.join(dirname, source_name)

    # JS/TS: __tests__/<stem>.test.<ext> → ../<stem>.<ext>
    if ".test" in stem:
        source_stem = stem.replace(".test", "")
        parent_dir = os.path.dirname(dirname)  # up from __tests__
        return os.path.join(parent_dir, f"{source_stem}{ext}")

    # Fallback
    return rel_test
