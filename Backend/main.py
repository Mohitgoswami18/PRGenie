import os
import hmac
import hashlib
import logging
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

# Load environment variables
load_dotenv()

from Backend.Database import database, models, crud
from Backend.Github import github_client
from Backend.AI.gemini_client import GeminiClient
from Backend.AI.models import ReviewResult
from Backend import auth

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
# Pydantic Response Models
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

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str


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
    pr_number: int
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
            ai_result = client.review_pr(diff_text, mode="balanced")
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
    
    if webhook_secret:
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
        pr_number=pr_number
    )

    return {"status": "accepted", "review_id": db_review.id}

@app.get("/api/reviews", response_model=ReviewsResponse)
def get_reviews(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    reviews_db = crud.get_reviews(db, skip=skip, limit=limit)
    reviews_list = []
    for r in reviews_db:
        # Convert created_at datetime to UTC ISO string format ending with 'Z'
        created_at_str = r.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if r.created_at else ""
        reviews_list.append(ReviewListItem(
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
            created_at=created_at_str
        ))
    return ReviewsResponse(reviews=reviews_list)

@app.get("/api/reviews/{review_id}", response_model=ReviewListItem)
def get_review_by_id(
    review_id: int, 
    db: Session = Depends(database.get_db)
):
    r = crud.get_review_by_id(db, review_id)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
        
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
        created_at=created_at_str
    )

# ---------------------------------------------------------------------------
# User Authentication Routes
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = crud.create_user(db, email=user.email, hashed_password=hashed_pwd, full_name=user.full_name)
    
    created_at_str = new_user.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if new_user.created_at else ""
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        created_at=created_at_str
    )

@app.post("/api/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    created_at_str = current_user.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if current_user.created_at else ""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        created_at=created_at_str
    )

