import os
import shutil
import git
from datetime import datetime

github_url = "https://github.com/YASH-DHADGE/DEVDEMO"
github_token = "YOUR_TOKEN_HERE"
clone_url = github_url.replace("https://", f"https://{github_token}@")
dest = "test_repo"

if os.path.exists(dest):
    shutil.rmtree(dest, ignore_errors=True)

try:
    print("Cloning...")
    repo = git.Repo.clone_from(clone_url, dest)
    print("Branching...")
    branch_name = f"test-patch-{datetime.now().strftime('%H%M%S')}"
    repo.git.checkout("-b", branch_name)
    print("Editing...")
    with open(f"{dest}/dummy.txt", "w") as f:
        f.write(f"Test push {branch_name}")
    print("Committing...")
    repo.git.add("--all")
    repo.index.commit("Test commit from script")
    print("Pushing...")
    repo.git.push("origin", branch_name)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
finally:
    if 'repo' in locals():
        repo.close()
    if os.path.exists(dest):
        shutil.rmtree(dest, ignore_errors=True)
