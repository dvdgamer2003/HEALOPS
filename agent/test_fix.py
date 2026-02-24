from tools.openrouter_tools import generate_targeted_fix
import os

file_content = """def add(a, b):
    return a + b

def multiply(a, b):
    # Bug here
    return a + b
"""

error_out = "AssertionError: 2 * 3 != 5"
bug_type = "LOGIC"
line_num = 6

fixed = generate_targeted_fix(file_content, error_out, bug_type, line_num)

print(f"Original == Fixed: {file_content.strip() == fixed.strip()}")
print("--- FIXED ---")
print(fixed)
