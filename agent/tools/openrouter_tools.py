"""AI fix generation via Google Gemini API."""

import os
import re
from langchain_core.messages import HumanMessage, SystemMessage

# Primary model — strong code reasoning, best fix quality
MODEL = "mistral-large-latest"

# Fallback used if the primary returns a context-length error
FALLBACK_MODEL = "open-mistral-nemo"

SYSTEM_PROMPT = """You are an autonomous software repair agent.

CRITICAL RULES:
1. You MUST change the code. If your output is identical to the input, the system will CRASH.
2. Find the bug described in the Error Output and FIX it. Do NOT return the same buggy code.
3. If the error is a math/logic bug (e.g., `a+b` instead of `a*b`), FIX the math/logic. You must change the `+` to `*` for calculator.py!
4. Return ONLY the raw checked-out code.
5. NO markdown formatting, NO explanations, NO ``` fences."""


def get_llm(model_name: str = MODEL, temperature: float = 0.1):
    """Create an OpenRouter Chat Model."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")
    
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(
        api_key=api_key,
        model=model_name,
        temperature=temperature,
        max_tokens=8192
    )


def _strip_code_fences(text: str) -> str:
    """Robustly strip markdown code fences (```python, ```js, etc.)."""
    text = text.strip()
    # Match opening fence with optional language tag
    if re.match(r"^```\w*\s*$", text.split("\n")[0]):
        lines = text.split("\n")
        # Remove opening fence
        lines = lines[1:]
        # Remove closing fence if present
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return text


def generate_fix(file_content: str, error_output: str, bug_type: str, line_number: int, is_retry: bool = False) -> str:
    """
    Send the failing file content + error to Gemini.
    Returns the complete fixed file content (raw code only).
    """
    retry_context = ""
    if is_retry:
        retry_context = """\n\nIMPORTANT — RETRY CONTEXT:
A previous AI-generated fix for this SAME file was already applied, but the error PERSISTS.
The previous fix was INSUFFICIENT. You MUST take a DIFFERENT approach this time.
Look deeper at the root cause — maybe a missing dependency, wrong function signature,
or an incorrect import path. Do NOT repeat the same fix."""

    prompt = f"""You are an expert software engineer fixing a specific bug.

RULES:
- Fix ONLY the specific issue described below. Do NOT refactor or change unrelated code.
- Preserve the entire file structure, imports, comments, and formatting.
- Return ONLY the complete fixed file content — no explanations, no markdown, no code fences.
- Make sure your fix actually RESOLVES the error shown below.
{retry_context}

Bug Type: {bug_type}
Approximate Line: {line_number}

Error Output (truncated):
{error_output[:3000]}

Complete File Content:
{file_content}

Output the COMPLETE fixed file content now (raw code only, no ``` fences):"""

    for attempt_model in (MODEL, FALLBACK_MODEL):
        try:
            with open(os.path.join(os.getcwd(), "llm_debug_prompt.txt"), "a", encoding="utf-8") as f:
                f.write(f"\n=== GENERATE_FIX PROMPT ===\n{prompt}\n")
                
            llm = get_llm(model_name=attempt_model, temperature=0.1)
            merged_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
            response = llm.invoke([HumanMessage(content=merged_prompt)])
            
            with open(os.path.join(os.getcwd(), "llm_debug_raw.txt"), "a", encoding="utf-8") as f:
                f.write(f"\n[RAW LLM RESPONSE - FIX]: {repr(response.content)}\n")
                
            fixed_code = _strip_code_fences(response.content)
            
            if attempt_model != MODEL:
                print(f"[openrouter_tools] Using fallback model {attempt_model}")
            
            # Sanity check: if empty, return original
            if not fixed_code.strip():
                return file_content
                
            return fixed_code
        except Exception as e:
            print(f"[openrouter_tools] generate_fix failed with {attempt_model}: {e}")
            if attempt_model == FALLBACK_MODEL:
                return file_content  # give up, return original


def analyze_error(error_output: str, file_content: str) -> dict:
    """
    Use AI to analyze an error and identify the bug type and location.
    Returns: { 'bug_type': str, 'line_number': int, 'description': str, 'fix_instruction': str }
    """
    prompt = f"""Analyze this test failure and identify the ROOT CAUSE (not secondary/cascading errors).
Focus on the FIRST error in the traceback. Identify the line in the SOURCE code (not the test file).

Error Output:
{error_output[:2000]}

Source Code:
{file_content[:3000]}

Respond in EXACTLY this format (no markdown, no extra text, no blank lines):
BUG_TYPE: <one of: LINTING, SYNTAX, LOGIC, TYPE_ERROR, IMPORT, INDENTATION>
LINE_NUMBER: <integer — the line in the source code causing the error>
DESCRIPTION: <one-line root cause description>
FIX_INSTRUCTION: <one-line instruction for how to fix this specific issue>"""

    try:
        llm = get_llm(model_name=MODEL, temperature=0.1)
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()

        result = {"bug_type": "LOGIC", "line_number": 1, "description": "Unknown error", "fix_instruction": ""}
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("BUG_TYPE:"):
                try:
                    result["bug_type"] = line.split(":", 1)[1].strip()
                except IndexError: pass
            elif line.startswith("LINE_NUMBER:"):
                try:
                    result["line_number"] = int(line.split(":", 1)[1].strip())
                except (ValueError, IndexError):
                    pass
            elif line.startswith("DESCRIPTION:"):
                try:
                    result["description"] = line.split(":", 1)[1].strip()
                except IndexError: pass
            elif line.startswith("FIX_INSTRUCTION:"):
                try:
                    result["fix_instruction"] = line.split(":", 1)[1].strip()
                except IndexError: pass

        return result
    except Exception as e:
        print(f"[openrouter_tools] Error analyzing error: {e}")
        return {"bug_type": "LOGIC", "line_number": 1, "description": str(e), "fix_instruction": ""}


def generate_targeted_fix(
    file_content: str,
    error_output: str,
    bug_type: str,
    line_number: int,
    fix_instruction: str = "",
    context_lines: int = 10,
) -> str:
    """
    Fix only the region around the failing line (±context_lines).
    Returns the complete file with the targeted patch applied.
    Falls back to original content on failure.
    """
    lines = file_content.splitlines(keepends=True)
    total = len(lines)

    # Calculate region bounds
    start = max(0, line_number - 1 - context_lines)
    end = min(total, line_number + context_lines)
    region = "".join(lines[start:end])

    instruction_ctx = ""
    if fix_instruction:
        instruction_ctx = f"\nFIX HINT: {fix_instruction}"

    prompt = f"""You are an expert software engineer. Fix ONLY the bug in the code region below.

RULES:
- Fix ONLY the specific issue described. Do NOT refactor or change unrelated code.
- Preserve exact formatting, indentation, comments, and blank lines.
- Return ONLY the fixed region (raw code only, no ``` fences, no explanations).
- The region starts at line {start + 1} of the original file.
{instruction_ctx}

Bug Type: {bug_type}
Failing Line: {line_number}

Error Output (truncated):
{error_output[:2000]}

Code Region (lines {start + 1}-{end}):
{region}

Output the FIXED region now (raw code only, same number of surrounding lines where unchanged):"""

    for attempt_model in (MODEL, FALLBACK_MODEL):
        try:
            with open(os.path.join(os.getcwd(), "llm_debug_prompt.txt"), "a", encoding="utf-8") as f:
                f.write(f"\n=== GENERATE_TARGETED_FIX PROMPT ===\n{prompt}\n")
                
            llm = get_llm(model_name=attempt_model, temperature=0.1)
            merged_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
            response = llm.invoke([HumanMessage(content=merged_prompt)])
            
            with open(os.path.join(os.getcwd(), "llm_debug_raw.txt"), "a", encoding="utf-8") as f:
                f.write(f"\n[RAW LLM RESPONSE - TARGETED]: {repr(response.content)}\n")
                
            fixed_region = _strip_code_fences(response.content)

            if not fixed_region.strip():
                return file_content

            # Splice the fixed region back into the original file
            fixed_lines = fixed_region.splitlines(keepends=True)
            # Ensure last line has newline
            if fixed_lines and not fixed_lines[-1].endswith("\n"):
                fixed_lines[-1] += "\n"

            result_lines = lines[:start] + fixed_lines + lines[end:]
            return "".join(result_lines)
        except Exception as e:
            print(f"[openrouter_tools] generate_targeted_fix failed with {attempt_model}: {e}")
            if attempt_model == FALLBACK_MODEL:
                return file_content


def generate_tests(
    source_code: str,
    file_path: str,
    framework: str = "pytest",
    is_django: bool = False,
    settings_module: str = "",
) -> str:
    """
    Generate a complete test file for the given source code using Gemini.
    """
    if is_django:
        style_instructions = f"""\
Use Django's test framework:
  from django.test import TestCase, Client
  from django.contrib.auth.models import User
  from django.urls import reverse

Each test class must extend django.test.TestCase.
Do NOT import or reference settings directly in test code.
Use self.client (Django test client) for any HTTP tests.
All database operations run inside a transaction that is rolled back automatically."""
    elif framework == "pytest":
        style_instructions = """\
Use plain pytest (no unittest.TestCase).
Use pytest fixtures where appropriate (e.g. tmp_path, monkeypatch).
Do NOT use Django imports or Django test client."""
    else:
        style_instructions = f"""\
Use {framework} (JavaScript/TypeScript testing).
For Jest:
  - Import with: const {{ functionName }} = require('./path/to/module')
    OR import {{ functionName }} from './path/to/module'  (if TypeScript/ESM)
  - Wrap tests in describe('<ModuleName>', () => {{ ... }})
  - Write: it('should ...', () => {{ expect(result).toBe(expected) }})
  - Use beforeEach/afterEach for setup/teardown
  - Use jest.fn() for mocks where needed (avoid mocking the whole module)
Do NOT use Python syntax. Do NOT use unittest constructs. Pure JavaScript only."""

    prompt = f"""\
You are an expert software test engineer. Your task is to generate a COMPLETE, RUNNABLE test file for the source code shown below.

SOURCE FILE: {file_path}

FRAMEWORK RULES:
{style_instructions}

STRICT RULES:
1. Generate REAL tests with REAL assertions — no placeholders like "assert True" or "pass".
2. Test the actual public functions/classes/views visible in the source code.
3. Cover at minimum: happy path, one edge case, and one failure/invalid-input case per function.
4. Do NOT modify the source code. Do NOT mock the entire module under test.
5. If a function has side effects (DB writes, file I/O), use setUp/tearDown or fixtures to isolate them.
6. Return ONLY the complete test file content. No explanations, no markdown fences, no extra text.
7. Every test function name must start with test_.

SOURCE CODE:
{source_code[:4000]}

Generate the complete test file now (raw code only, no ``` fences):"""

    for attempt_model in (MODEL, FALLBACK_MODEL):
        try:
            llm = get_llm(model_name=attempt_model, temperature=0.1)
            response = llm.invoke([HumanMessage(content=prompt)])
            raw = response.content or ""
            if attempt_model != MODEL:
                print(f"[openrouter_tools] generate_tests using fallback model {attempt_model}")
            return _strip_code_fences(raw)
        except Exception as e:
            print(f"[openrouter_tools] generate_tests failed with {attempt_model}: {e}")
            if attempt_model == FALLBACK_MODEL:
                return ""  # give up
