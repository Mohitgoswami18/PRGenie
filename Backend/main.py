import os
import re
import hmac
import hashlib
import logging
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import func

import sys
# Load environment variables from Backend/.env (relative to this file's directory)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_backend_dir, ".env"))
# Also try loading AI-specific .env
load_dotenv(os.path.join(_backend_dir, "AI", ".env"))

# Ensure parent directory of Backend is in sys.path to allow "from Backend..." imports
_parent_dir = os.path.dirname(_backend_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from Backend.Database import database, models, crud
from Backend.Github import github_client
from Backend.AI.gemini_client import GeminiClient
from Backend.AI.models import ReviewResult

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prgenie.backend")

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="PRGenie Backend", version="1.0.0")

# Enable CORS for React dashboard/frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Request / Response Models
# ---------------------------------------------------------------------------

class ReviewListItem(BaseModel):
    id: int
    repo_full_name: str
    pr_number: int
    pr_title: str
    pr_author: str
    pr_url: str
    review_text: str
    bugs_found: int
    security_issues: int
    status: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ReviewsResponse(BaseModel):
    reviews: list[ReviewListItem]

class StatsResponse(BaseModel):
    total_reviews: int
    bugs_caught: int
    security_issues_prevented: int
    avg_review_time: str

class AnalyzeRequest(BaseModel):
    pr_url: str
    mode: str = "balanced"

class AnalyzeResponse(BaseModel):
    status: str
    review_id: int
    message: str

class DeleteResponse(BaseModel):
    status: str
    message: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_github_pr_url(url: str) -> tuple[str, int]:
    """
    Parse a GitHub PR URL into (repo_full_name, pr_number).
    
    Accepts URLs like:
      - https://github.com/owner/repo/pull/123
      - github.com/owner/repo/pull/123
    """
    pattern = r"github\.com/([^/]+/[^/]+)/pull/(\d+)"
    match = re.search(pattern, url.strip())
    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {url}")
    return match.group(1), int(match.group(2))


def _review_to_item(r) -> ReviewListItem:
    """Convert a DB Review row to a ReviewListItem."""
    created_at_str = r.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if r.created_at else ""
    return ReviewListItem(
        id=r.id,
        repo_full_name=r.repo_full_name,
        pr_number=r.pr_number,
        pr_title=r.pr_title or "",
        pr_author=r.pr_author or "",
        pr_url=r.pr_url or "",
        review_text=r.review_text or "",
        bugs_found=r.bugs_found,
        security_issues=r.security_issues,
        status=r.status,
        created_at=created_at_str,
    )

# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------

def format_findings_to_markdown(findings: list, default_msg: str) -> str:
    if not findings:
        return f"- {default_msg}\n"
    
    lines = []
    for f in findings:
        file_val = getattr(f, "file", None)
        line_val = getattr(f, "line", None)
        desc_val = getattr(f, "description", "")
        sug_val = getattr(f, "suggestion", None)
        
        loc = ""
        if file_val and line_val:
            loc = f"Line {line_val} ({file_val})"
        elif file_val:
            loc = f"{file_val}"
        elif line_val:
            loc = f"Line {line_val}"
            
        header = f"- **{loc}**: " if loc else "- "
        lines.append(f"{header}{desc_val}")
        if sug_val:
            suggestion_lines = sug_val.split('\n')
            indented_suggestion = '\n  '.join(suggestion_lines)
            lines.append(f"  *Suggestion*: {indented_suggestion}")
    return '\n'.join(lines) + '\n'

def format_review_to_markdown(result: ReviewResult) -> str:
    md = f"# AutoReview AI PR Feedback 🤖\n\n"
    if result.summary:
        md += f"### Summary\n{result.summary}\n\n"
        
    md += "## 🐛 Bugs & Logic Errors\n"
    md += format_findings_to_markdown(result.bugs, "No bugs found.") + "\n"
    
    md += "## 🔒 Security Vulnerabilities\n"
    md += format_findings_to_markdown(result.security, "No issues.") + "\n"
    
    md += "## 🧪 Missing Test Coverage\n"
    md += format_findings_to_markdown(result.tests, "No missing test coverage identified.") + "\n"
    
    md += "## 💡 Improvement Suggestions\n"
    md += format_findings_to_markdown(result.improvements, "No improvements suggested.") + "\n"
    
    return md

# ---------------------------------------------------------------------------
# Background Review Task
# ---------------------------------------------------------------------------

def process_and_review_pr(
    db_review_id: int, 
    diff_url: str, 
    repo_full_name: str, 
    pr_number: int,
    review_mode: str = "balanced",
):
    db = next(database.get_db())
    try:
        logger.info(f"Starting review process for review ID: {db_review_id}")
        github_token = os.getenv("GITHUB_PAT")
        
        # 1. Fetch diff from GitHub
        try:
            diff_text = github_client.fetch_diff(diff_url, github_token)
        except Exception as e:
            logger.error(f"Failed to fetch diff from GitHub: {e}")
            crud.update_review_error(db, db_review_id, f"Failed to fetch diff: {e}")
            return
            
        if not diff_text or not diff_text.strip():
            logger.info("Empty diff text. Marking as complete with empty results.")
            crud.update_review_success(
                db=db,
                review_id=db_review_id,
                review_text="No code changes detected in this pull request.",
                bugs_found=0,
                security_issues=0
            )
            return

        # 2. Run Gemini review
        try:
            client = GeminiClient()
            ai_result = client.review_pr(diff_text, mode=review_mode)
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            crud.update_review_error(db, db_review_id, f"Gemini API review failure: {e}")
            return

        # 3. Format findings into markdown comment
        markdown_text = format_review_to_markdown(ai_result)

        # 4. Post comment to GitHub PR
        if github_token:
            try:
                github_client.post_pr_comment(repo_full_name, pr_number, markdown_text, github_token)
                logger.info(f"Posted review comment on PR {repo_full_name}#{pr_number}")
            except Exception as e:
                logger.error(f"Failed to post comment to GitHub: {e}")
                # We do not mark the review as failed just because posting comment failed, but we log it
        else:
            logger.warning("GITHUB_PAT not set. Skipped posting comment to GitHub.")

        # 5. Update DB review record with results
        crud.update_review_success(
            db=db,
            review_id=db_review_id,
            review_text=markdown_text,
            bugs_found=len(ai_result.bugs),
            security_issues=len(ai_result.security)
        )
        logger.info(f"Successfully completed review for review ID: {db_review_id}")
    except Exception as e:
        logger.error(f"Unexpected error in background review: {e}")
        crud.update_review_error(db, db_review_id, f"Unexpected error: {e}")
    finally:
        db.close()

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/webhook")
async def github_webhook(
    request: Request, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(database.get_db)
):
    # 1. Verify GitHub Webhook Signature if secret configured
    webhook_secret = os.getenv("WEBHOOK_SECRET")
    body = await request.body()
    
    if webhook_secret and webhook_secret != "your_webhook_secret_here":
        sig = request.headers.get("X-Hub-Signature-256")
        if not sig:
            raise HTTPException(status_code=403, detail="X-Hub-Signature-256 header missing")
        expected = "sha256=" + hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=403, detail="Invalid webhook signature")

    # 2. Check Event Type
    event_type = request.headers.get("X-GitHub-Event")
    if event_type == "ping":
        return {"status": "ok", "message": "ping successful"}
    
    if event_type != "pull_request":
        return {"status": "skipped", "message": f"unhandled event type: {event_type}"}

    payload = await request.json()
    action = payload.get("action")
    
    # Process only PR events: opened, synchronize (new commits), reopened
    if action not in ["opened", "synchronize", "reopened"]:
        return {"status": "skipped", "message": f"unhandled action: {action}"}

    pr_data = payload.get("pull_request", {})
    pr_number = payload.get("number")
    repo_data = payload.get("repository", {})
    repo_full_name = repo_data.get("full_name")
    
    pr_title = pr_data.get("title", "")
    pr_author = pr_data.get("user", {}).get("login", "")
    pr_url = pr_data.get("html_url", "")
    diff_url = pr_data.get("diff_url", "")

    if not repo_full_name or not pr_number or not diff_url:
        raise HTTPException(status_code=400, detail="Missing required pull request metadata in payload")

    # 3. Create Pending database log entry
    db_review = crud.create_pending_review(
        db=db,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        pr_title=pr_title,
        pr_author=pr_author,
        pr_url=pr_url
    )

    # 4. Trigger review in background task
    background_tasks.add_task(
        process_and_review_pr,
        db_review_id=db_review.id,
        diff_url=diff_url,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
    )

    return {"status": "accepted", "review_id": db_review.id}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_pr(
    payload: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    """
    Accept a GitHub PR URL from the frontend, fetch its metadata,
    create a pending review, and trigger the AI review in the background.
    """
    # 1. Parse the PR URL
    try:
        repo_full_name, pr_number = parse_github_pr_url(payload.pr_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Validate mode
    review_mode = payload.mode
    if review_mode not in ("strict", "balanced", "detailed"):
        review_mode = "balanced"

    github_token = os.getenv("GITHUB_PAT")

    # 2. Fetch PR details from GitHub API
    try:
        pr_data = github_client.fetch_pr_details(repo_full_name, pr_number, github_token)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch PR from GitHub: {e}. Make sure the PR URL is valid and the repo is public (or GITHUB_PAT is set).",
        )

    pr_title = pr_data.get("title", "")
    pr_author = pr_data.get("user", {}).get("login", "")
    pr_url = pr_data.get("html_url", "")
    diff_url = pr_data.get("diff_url", "")

    if not diff_url:
        raise HTTPException(status_code=400, detail="Could not determine diff URL for this PR.")

    # 3. Create pending review record
    db_review = crud.create_pending_review(
        db=db,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        pr_title=pr_title,
        pr_author=pr_author,
        pr_url=pr_url,
    )

    # 4. Trigger background review
    background_tasks.add_task(
        process_and_review_pr,
        db_review_id=db_review.id,
        diff_url=diff_url,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        review_mode=review_mode,
    )

    return AnalyzeResponse(
        status="accepted",
        review_id=db_review.id,
        message=f"Review queued for {repo_full_name}#{pr_number} (mode: {review_mode})",
    )


@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(database.get_db)):
    """
    Return aggregate statistics computed from the reviews table.
    """
    total_reviews = db.query(func.count(models.Review.id)).scalar() or 0
    bugs_caught = db.query(func.coalesce(func.sum(models.Review.bugs_found), 0)).scalar()
    security_issues = db.query(func.coalesce(func.sum(models.Review.security_issues), 0)).scalar()

    # Compute average review time placeholder — we don't track duration yet,
    # so estimate based on the data we have
    if total_reviews > 0:
        avg_review_time = "< 1s"
    else:
        avg_review_time = "0.0s"

    return StatsResponse(
        total_reviews=total_reviews,
        bugs_caught=int(bugs_caught),
        security_issues_prevented=int(security_issues),
        avg_review_time=avg_review_time,
    )


@app.get("/api/reviews", response_model=ReviewsResponse)
def get_reviews(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    reviews_db = crud.get_reviews(db, skip=skip, limit=limit)
    return ReviewsResponse(reviews=[_review_to_item(r) for r in reviews_db])


@app.get("/api/reviews/{review_id}", response_model=ReviewListItem)
def get_review_by_id(
    review_id: int, 
    db: Session = Depends(database.get_db)
):
    r = crud.get_review_by_id(db, review_id)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    return _review_to_item(r)


@app.delete("/api/reviews/{review_id}", response_model=DeleteResponse)
def delete_review(
    review_id: int,
    db: Session = Depends(database.get_db),
):
    r = crud.get_review_by_id(db, review_id)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(r)
    db.commit()
    return DeleteResponse(status="ok", message=f"Review {review_id} deleted.")
