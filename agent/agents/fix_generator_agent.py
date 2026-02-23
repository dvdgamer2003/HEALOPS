"""Node 5: FixGeneratorAgent — Use Gemini to generate targeted code fixes."""

import os
from tools.openrouter_tools import generate_fix, generate_targeted_fix


def fix_generator_node(state: dict) -> dict:
    """
    For each identified failure, generate a TARGETED fix using Gemini AI
    and apply it to the file. Uses targeted patching first (±10 lines around
    the error), falling back to full-file fix if targeted fix produces no diff.

    Uses a retry counter per file — only blacklists after 2 consecutive
    no-diff attempts.
    """
    repo_path = state["repo_local_path"]
    failures = state.get("failures", [])
    fixes_applied = list(state.get("fixes_applied", []))
    files_failed_before = set(state.get("files_failed_before", []))
    iteration = state.get("iteration", 1)

    # Per-file no-diff counter: how many times Gemini returned no diff
    # This persists across iterations via state.
    no_diff_counts: dict = dict(state.get("no_diff_counts", {}))
    MAX_NO_DIFF_RETRIES = 2  # blacklist after this many no-diff attempts

    new_fix_count = 0
    new_failed_files = set()

    for failure in failures:
        file_path = failure["file"]

        # Skip files that are permanently blacklisted
        if file_path in files_failed_before:
            print(f"[AGENT] ⏭ Skipping {file_path} (blacklisted after {MAX_NO_DIFF_RETRIES} failed attempts)")
            continue

        full_path = os.path.join(repo_path, file_path)

        if not os.path.exists(full_path):
            print(f"[AGENT] File not found: {full_path}")
            fixes_applied.append({
                "file": file_path,
                "bug_type": failure["bug_type"],
                "line_number": failure["line_number"],
                "commit_message": f"fix: could not find {file_path}",
                "status": "Failed",
            })
            new_failed_files.add(file_path)
            files_failed_before.add(file_path)
            continue

        # Read the current file content
        with open(full_path, "r", errors="replace") as f:
            file_content = f.read()

        # Determine if this is a retry (previous fix was attempted)
        prior_attempts = no_diff_counts.get(file_path, 0)
        is_retry = prior_attempts > 0 or iteration > 1

        # Generate fix using Gemini — try targeted patch first, then full-file fallback
        try:
            fixed_content = None
            line_number = failure.get("line_number", 1)
            fix_instruction = failure.get("fix_instruction", "")

            # Step 1: Try targeted fix (patch only the failing region)
            if line_number > 0:
                print(f"[AGENT] generating targeted fix for {file_path} line {line_number}")
                fixed_content = generate_targeted_fix(
                    file_content=file_content,
                    error_output=failure.get("error_output", ""),
                    bug_type=failure["bug_type"],
                    line_number=line_number,
                    fix_instruction=fix_instruction,
                )

            # Step 2: Fall back to full-file fix if targeted produced no diff
            if not fixed_content or fixed_content.strip() == file_content.strip():
                print(f"[AGENT] targeted fix had no diff, trying full-file fix for {file_path}")
                fixed_content = generate_fix(
                    file_content=file_content,
                    error_output=failure.get("error_output", ""),
                    bug_type=failure["bug_type"],
                    line_number=line_number,
                    is_retry=is_retry,
                )
                
            print("=== LLM OUTPUT ===")
            print(fixed_content)
            
            with open(os.path.join(os.getcwd(), "llm_debug_output.txt"), "a", encoding="utf-8") as debug_file:
                debug_file.write(f"\n--- TARGET: {file_path} ---\n{fixed_content}\n")

            # Apply the fix
            if fixed_content and fixed_content.strip() != file_content.strip():
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(fixed_content)

                commit_msg = f"fix: {failure['bug_type'].lower()} issue in {file_path} line {line_number}"
                fixes_applied.append({
                    "file": file_path,
                    "bug_type": failure["bug_type"],
                    "line_number": line_number,
                    "commit_message": f"[AI-AGENT] {commit_msg}",
                    "status": "Fixed",
                })
                new_fix_count += 1
                no_diff_counts[file_path] = 0  # reset on success
                print(f"[AGENT] ✓ Fixed {file_path} ({failure['bug_type']})")
            else:
                # No diff produced — increment retry counter
                no_diff_counts[file_path] = prior_attempts + 1
                current_count = no_diff_counts[file_path]

                if current_count >= MAX_NO_DIFF_RETRIES:
                    # Permanently blacklist after MAX_NO_DIFF_RETRIES
                    fixes_applied.append({
                        "file": file_path,
                        "bug_type": failure["bug_type"],
                        "line_number": line_number,
                        "commit_message": f"fix: no change generated for {file_path} after {current_count} attempts",
                        "status": "Failed",
                    })
                    new_failed_files.add(file_path)
                    files_failed_before.add(file_path)
                    print(f"[AGENT] ✗ No change for {file_path} after {current_count} attempts — blacklisted")
                else:
                    print(f"[AGENT] ⚠ No diff for {file_path} (attempt {current_count}/{MAX_NO_DIFF_RETRIES}) — will retry next iteration")

        except Exception as e:
            fixes_applied.append({
                "file": file_path,
                "bug_type": failure["bug_type"],
                "line_number": failure["line_number"],
                "commit_message": f"fix: error generating fix — {str(e)[:80]}",
                "status": "Failed",
            })
            # Do NOT blacklist on transient errors (API downtime, bad model ID, etc.)
            print(f"[AGENT] ✗ Transient error for {file_path} (will retry): {e}")

    # Build log entries
    logs = list(state.get("logs", []))
    skipped = len(files_failed_before & {f["file"] for f in failures})
    if skipped:
        logs.append(f"Skipped {skipped} file(s) — could not be auto-fixed")
    logs.append(f"Fix attempt {iteration}: applied {new_fix_count} patch(es), {len(new_failed_files)} failed")

    # Merge failed files for future iterations
    all_failed = files_failed_before | new_failed_files

    return {
        **state,
        "fixes_applied": fixes_applied,
        "new_fix_count": new_fix_count,
        "files_failed_before": list(all_failed),
        "no_diff_counts": no_diff_counts,
        "current_step": "Generating fixes...",
        "logs": logs,
    }
