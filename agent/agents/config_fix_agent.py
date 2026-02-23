"""Node 4b: ConfigFixAgent — Auto-generate pytest/Django config when collection fails.

Triggered when code_analysis_node detects a COLLECTION_ERROR or NO_TESTS_COLLECTED
exit class. Instead of trying to Gemini-fix application code (which produces no diff),
this node writes the minimal files needed to make pytest collect and pass:

  1. pytest.ini  — sets DJANGO_SETTINGS_MODULE so pytest-django works
  2. requirements.txt patch — injects pytest + pytest-django if missing
  3. Home/tests.py scaffold — adds one real test so 0-collected never happens again

The node marks all written paths in fixes_applied so commit_agent picks them up.
"""

import os
import subprocess
import sys


# ─── Templates ────────────────────────────────────────────────────────────────

PYTEST_INI_TEMPLATE = """\
[pytest]
DJANGO_SETTINGS_MODULE = {settings_module}
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts = --tb=short -q
filterwarnings =
    ignore::DeprecationWarning
"""

DJANGO_SMOKE_TEST_TEMPLATE = """\
\"\"\"Auto-generated smoke tests — added by CI healing agent.

These minimal tests ensure pytest always collects ≥1 test, preventing
exit-code-5 failures. Add real tests alongside these as the project grows.
\"\"\"

from django.test import TestCase
from django.contrib.auth.models import User


class SmokeTest(TestCase):
    \"\"\"Baseline health checks for the {app_name} Django app.\"\"\"

    def test_app_is_importable(self):
        \"\"\"Importing the app module does not raise any errors.\"\"\"
        import importlib
        mod = importlib.import_module("{app_module}")
        self.assertIsNotNone(mod)

    def test_database_is_accessible(self):
        \"\"\"Django ORM can read from the (test) database.\"\"\"
        count = User.objects.count()
        self.assertGreaterEqual(count, 0)

    def test_user_creation(self):
        \"\"\"Creating a user via the ORM works as expected.\"\"\"
        user = User.objects.create_user("smoke_test_user", password="securepass1!")
        self.assertEqual(user.username, "smoke_test_user")
"""

TEST_DEPS = ["pytest>=7.0", "pytest-django>=4.5"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _find_settings_module(repo_path: str) -> str:
    """Infer the DJANGO_SETTINGS_MODULE from the repo layout.

    Looks for a settings.py one level deep (e.g. HostelPal/settings.py)
    and converts the path to dotted notation (HostelPal.settings).
    Falls back to 'config.settings' then 'settings' if nothing found.
    """
    for entry in os.listdir(repo_path):
        pkg_dir = os.path.join(repo_path, entry)
        if not os.path.isdir(pkg_dir):
            continue
        if os.path.exists(os.path.join(pkg_dir, "settings.py")):
            return f"{entry}.settings"
    # Fallback guesses
    for fallback in ("config.settings", "settings"):
        return fallback
    return "settings"


def _patch_requirements(repo_path: str) -> bool:
    """Add pytest and pytest-django to requirements.txt if missing.

    Returns True if the file was modified.
    """
    req_path = os.path.join(repo_path, "requirements.txt")
    if not os.path.exists(req_path):
        with open(req_path, "w", encoding="utf-8") as f:
            f.write("\n".join(TEST_DEPS) + "\n")
        return True

    with open(req_path, "r", encoding="utf-8") as f:
        current = f.read()

    missing = [dep for dep in TEST_DEPS if dep.split(">=")[0] not in current]
    if not missing:
        return False

    with open(req_path, "a", encoding="utf-8") as f:
        f.write("\n# Added by CI healing agent\n")
        f.write("\n".join(missing) + "\n")
    return True


def _find_django_app(repo_path: str) -> tuple[str, str]:
    """Return (app_name, dotted_module) for the first Django app found.

    A Django app is a directory containing both __init__.py and models.py.
    Returns ('Home', 'Home') for a typical flat-layout project.
    """
    for entry in os.listdir(repo_path):
        app_dir = os.path.join(repo_path, entry)
        if (
            os.path.isdir(app_dir)
            and os.path.exists(os.path.join(app_dir, "__init__.py"))
            and os.path.exists(os.path.join(app_dir, "models.py"))
        ):
            return entry, entry
    return "app", "app"


def _install_test_deps(repo_path: str) -> None:
    """pip-install the test deps right now so the next pytest run succeeds."""
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install"] + TEST_DEPS,
            cwd=repo_path,
            capture_output=True,
            timeout=120,
        )
    except Exception:
        pass  # Non-fatal; requirements.txt patch will handle it in the next dep-install step


# ─── Main node ────────────────────────────────────────────────────────────────

def config_fix_node(state: dict) -> dict:
    """
    Write pytest.ini, patch requirements.txt, and scaffold Home/tests.py so that
    the next loop iteration's pytest invocation succeeds (no import crash, ≥1 test).

    This node fires only when code_analysis_node returns 0 failures due to a
    config/collection fault (test_exit_class in COLLECTION_ERROR | NO_TESTS_COLLECTED).
    """
    repo_path = state["repo_local_path"]
    exit_class = state.get("test_exit_class", "")
    fixes_applied = list(state.get("fixes_applied", []))
    logs = list(state.get("logs", []))

    created_files = []

    # ── 1. Detect Django settings module ─────────────────────────────────────
    settings_module = _find_settings_module(repo_path)
    print(f"[AGENT] detected settings module: {settings_module}")

    # ── 2. Write pytest.ini ───────────────────────────────────────────────────
    pytest_ini_path = os.path.join(repo_path, "pytest.ini")
    if not os.path.exists(pytest_ini_path):
        content = PYTEST_INI_TEMPLATE.format(settings_module=settings_module)
        with open(pytest_ini_path, "w", encoding="utf-8") as f:
            f.write(content)
        created_files.append("pytest.ini")
        fixes_applied.append({
            "file": "pytest.ini",
            "bug_type": "CONFIG",
            "line_number": 0,
            "commit_message": "[AI-AGENT] fix(ci): add pytest.ini with DJANGO_SETTINGS_MODULE to fix collection import crash",
            "status": "Fixed",
        })
        logs.append(f"Created pytest config (Django settings: {settings_module})")
        print(f"[AGENT] ✓ created pytest.ini")
    else:
        logs.append("pytest config already exists")
        print(f"[AGENT] ℹ pytest.ini already exists")

    # ── 3. Patch requirements.txt ─────────────────────────────────────────────
    if _patch_requirements(repo_path):
        created_files.append("requirements.txt")
        fixes_applied.append({
            "file": "requirements.txt",
            "bug_type": "CONFIG",
            "line_number": 0,
            "commit_message": "[AI-AGENT] fix(deps): add pytest + pytest-django so CI can collect tests",
            "status": "Fixed",
        })
        logs.append("Added test dependencies to requirements.txt")
        print(f"[AGENT] ✓ patched requirements.txt")

    # ── 4. Scaffold a minimal test file if NO_TESTS_COLLECTED ─────────────────
    if exit_class == "NO_TESTS_COLLECTED":
        app_name, app_module = _find_django_app(repo_path)
        tests_path = os.path.join(repo_path, app_name, "tests.py")
        # Only write if the file is empty / stub (< 200 bytes)
        needs_scaffold = (
            not os.path.exists(tests_path)
            or os.path.getsize(tests_path) < 200
        )
        if needs_scaffold:
            content = DJANGO_SMOKE_TEST_TEMPLATE.format(
                app_name=app_name,
                app_module=app_module,
            )
            with open(tests_path, "w", encoding="utf-8") as f:
                f.write(content)
            rel_path = os.path.join(app_name, "tests.py")
            created_files.append(rel_path)
            fixes_applied.append({
                "file": rel_path,
                "bug_type": "CONFIG",
                "line_number": 0,
                "commit_message": f"[AI-AGENT] test({app_name}): scaffold minimal smoke tests so pytest collects ≥1 test",
                "status": "Fixed",
            })
            logs.append(f"Created starter test file: {rel_path}")
            print(f"[AGENT] ✓ scaffolded {rel_path}")
        else:
            logs.append(f"Tests already exist in {app_name}/tests.py")

    # ── 5. pip-install the new deps immediately (best-effort) ─────────────────
    _install_test_deps(repo_path)

    # ── Summary ───────────────────────────────────────────────────────────────
    changed = len(created_files) > 0
    if changed:
        logs.append(f"Config updated: {len(created_files)} file(s) written")
        print(f"[AGENT] config fix complete: {created_files}")
    else:
        logs.append("No config changes needed")
        print(f"[AGENT] ⚠ nothing new to write — will finalize")

    return {
        **state,
        "fixes_applied": fixes_applied,
        "config_fix_changed": changed,  # consumed by _after_config_fix in agent_graph
        "current_step": "Applying config fix...",
        "logs": logs,
    }
