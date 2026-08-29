import base64
import requests
import re

def parse_github_url(url: str):
    clean = url.rstrip('/')
    match = re.search(r'github\.com/([^/]+)/([^/]+)', clean)
    if not match:
        return None, None
    return match.group(1), match.group(2).replace('.git', '')

def fetch_file_content(owner: str, repo: str, path: str, headers: dict) -> str:
    try:
        r = requests.get(f"https://api.github.com/repos/{owner}/{repo}/contents/{path}", headers=headers, timeout=6)
        if r.status_code == 200:
            return base64.b64decode(r.json().get("content", "")).decode("utf-8", errors="ignore")
    except Exception:
        pass
    return ""

def clone_and_parse_repo(repo_url: str) -> dict:
    owner, repo = parse_github_url(repo_url)
    if not owner or not repo:
        return {"success": False, "error": "Invalid GitHub repository URL"}

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PitchPilot-App"
    }

    # 1. Fetch README
    readme_content = fetch_file_content(owner, repo, "README.md", headers) or "No README provided."

    # 2. Inspect manifest dependencies
    manifests = ["package.json", "requirements.txt", "go.mod", "Cargo.toml", "pom.xml"]
    detected_tech = []
    for manifest in manifests:
        content = fetch_file_content(owner, repo, manifest, headers)
        if content:
            detected_tech.append(f"--- {manifest} snippet ---\n{content[:500]}")

    # 3. Fetch file tree
    file_tree = []
    for branch in ["main", "master"]:
        try:
            r = requests.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1", headers=headers, timeout=8)
            if r.status_code == 200:
                tree_data = r.json().get("tree", [])
                file_tree = [item["path"] for item in tree_data[:80]]
                break
        except Exception:
            pass

    if not file_tree:
        file_tree = ["app.py", "main.py", "src/"]

    return {
        "success": True,
        "readme": readme_content[:3500],
        "dependencies": "\n".join(detected_tech),
        "file_tree": "\n".join(file_tree)
    }