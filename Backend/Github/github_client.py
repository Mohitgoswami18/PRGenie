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


def fetch_pr_details(repo_full_name: str, pr_number: int, github_token: str | None = None) -> dict:
    """
    Fetch PR metadata from the GitHub API.

    Returns the raw JSON response which includes keys like:
      - title, user.login, html_url, diff_url, state, etc.
    """
    url = f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PRGenie-Bot",
    }
    if github_token:
        headers["Authorization"] = f"token {github_token}"

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


def post_pr_comment(repo_full_name: str, pr_number: int, comment: str, github_token: str) -> dict:
    """
    Post a markdown comment on the GitHub PR issues timeline.
    """
    url = f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PRGenie-Bot",
    }
    payload = {"body": comment}
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()
