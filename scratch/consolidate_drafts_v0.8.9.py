import subprocess
import os
import sys

# Clean GITHUB_TOKEN environment variable to enforce keychain authentication
if "GITHUB_TOKEN" in os.environ:
    del os.environ["GITHUB_TOKEN"]

print("Consolidating v0.8.9 draft releases...")

try:
    # 1. Recreate changelog_notes.md
    print("Re-extracting changelog notes...")
    subprocess.run(["node", "scripts/extract-changelog.js", "0.8.9", "changelog_notes.md"], check=True)

    # 2. Delete the duplicate draft release (ID: 332538909)
    duplicate_id = "332538909"
    print(f"Deleting duplicate local draft release {duplicate_id}...")
    subprocess.run(["gh", "api", "-X", "DELETE", f"repos/OmegaProjct/Omega-Wave-Editor/releases/{duplicate_id}"], check=True)

    # 3. Upload Windows files to the CI/CD action draft release (tag: v0.8.9)
    print("Uploading Windows assets to the CI/CD draft release...")
    subprocess.run([
        "gh", "release", "upload", "v0.8.9",
        "dist-bin/Omega Wave Editor Setup 0.8.9.exe",
        "dist-bin/Omega Wave Editor-Portable-0.8.9.exe",
        "dist-bin/Omega Wave Editor Setup 0.8.9.exe.blockmap",
        "--clobber"
    ], check=True)

    # 4. Update the title and notes file of the CI/CD draft release
    print("Updating draft release title and release notes...")
    subprocess.run([
        "gh", "release", "edit", "v0.8.9",
        "--title", "Omega Wave Editor v0.8.9",
        "--notes-file", "changelog_notes.md"
    ], check=True)

    # 5. Clean up temporary changelog_notes.md
    if os.path.exists("changelog_notes.md"):
        os.remove("changelog_notes.md")

    print("Draft releases consolidated successfully!")
except subprocess.CalledProcessError as e:
    print(f"Error occurred during consolidation: {e}")
    sys.exit(1)
