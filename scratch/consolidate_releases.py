import subprocess
import os
import json
import sys

# Ensure environment variable is clean of overrides to use the gh CLI's active authenticated session
if "GITHUB_TOKEN" in os.environ:
    del os.environ["GITHUB_TOKEN"]

print("Starting release consolidation process...")

# 1. Delete the manually published duplicate release (ID: 332521887)
duplicate_release_id = "332521887"
print(f"Deleting duplicate published release (ID: {duplicate_release_id})...")
try:
    cmd_delete = ["gh", "api", "-X", "DELETE", f"repos/OmegaProjct/Omega-Wave-Editor/releases/{duplicate_release_id}"]
    res_delete = subprocess.run(cmd_delete, capture_output=True, text=True, check=True)
    print("Duplicate release deleted successfully.")
except subprocess.CalledProcessError as e:
    print(f"Error deleting duplicate release: {e}")
    print(f"stdout: {e.stdout}")
    print(f"stderr: {e.stderr}")
    # Don't fail immediately, in case it was already deleted

# 2. Publish and update the draft release containing all 8+ assets (ID: 332521781)
draft_release_id = "332521781"
notes_file_path = "scratch/release_notes_v0.8.8.md"
print(f"Publishing and updating draft release (ID: {draft_release_id}) with assets...")

try:
    cmd_publish = [
        "gh", "api", "-X", "PATCH", f"repos/OmegaProjct/Omega-Wave-Editor/releases/{draft_release_id}",
        "-F", "draft=false",
        "-F", "tag_name=v0.8.8",
        "-F", "name=Omega Wave Editor v0.8.8",
        "-F", f"body=@{notes_file_path}",
        "-F", "make_latest=true"
    ]
    res_publish = subprocess.run(cmd_publish, capture_output=True, text=True, check=True)
    print("Draft release published and updated successfully!")
    print(res_publish.stdout[:200] + "...")
except subprocess.CalledProcessError as e:
    print(f"Error publishing draft release: {e}")
    print(f"stdout: {e.stdout}")
    print(f"stderr: {e.stderr}")
    sys.exit(1)

print("Release consolidation completed successfully!")
