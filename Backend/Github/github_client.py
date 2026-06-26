import requests

def fetch_diff(diff_url: str, github_token: str | None = None) -> str:
    """
    Fetch the unified diff of the PR.
    """
    headers = {"User-Agent": "PRGenie-Bot"}
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    response = requests.get(diff_url, headers=headers)
    response.raise_for_status()
    return response.text

def post_pr_comment(repo_full_name: str, pr_number: int, comment: str, github_token: str) -> dict:
    """
    Post a markdown comment on the GitHub PR issues timeline.
    """
    url = f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PRGenie-Bot"
    }
    payload = {"body": comment}
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

import re

def parse_pr_url(pr_url: str) -> tuple[str, int]:
    """
    Parse a GitHub PR URL and return (repo_full_name, pr_number).
    Expected formats:
      https://github.com/owner/repo/pull/123
      github.com/owner/repo/pull/123
    """
    match = re.search(r"github\.com/([^/]+/[^/]+)/pull/(\d+)", pr_url)
    if not match:
        raise ValueError("Invalid GitHub Pull Request URL. Must be in format: https://github.com/owner/repo/pull/number")
    repo_full_name = match.group(1)
    pr_number = int(match.group(2))
    return repo_full_name, pr_number

def fetch_pr_metadata(repo_full_name: str, pr_number: int, github_token: str | None = None) -> dict:
    """
    Fetch Pull Request metadata from the GitHub API.
    """
    url = f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PRGenie-Bot"
    }
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

