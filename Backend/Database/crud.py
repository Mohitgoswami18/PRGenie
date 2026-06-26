from datetime import datetime
from sqlalchemy.orm import Session
from . import models

def create_pending_review(
    db: Session, 
    repo_full_name: str, 
    pr_number: int, 
    pr_title: str, 
    pr_author: str, 
    pr_url: str
) -> models.Review:
    db_review = models.Review(
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        pr_title=pr_title,
        pr_author=pr_author,
        pr_url=pr_url,
        status="pending",
        review_text="",
        bugs_found=0,
        security_issues=0,
        created_at=datetime.utcnow()
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

def update_review_success(
    db: Session, 
    review_id: int, 
    review_text: str, 
    bugs_found: int, 
    security_issues: int
) -> models.Review | None:
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if db_review:
        db_review.status = "complete"
        db_review.review_text = review_text
        db_review.bugs_found = bugs_found
        db_review.security_issues = security_issues
        db.commit()
        db.refresh(db_review)
    return db_review

def update_review_error(db: Session, review_id: int, error_message: str) -> models.Review | None:
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if db_review:
        db_review.status = "error"
        db_review.review_text = f"Error during review: {error_message}"
        db.commit()
        db.refresh(db_review)
    return db_review

def get_reviews(db: Session, skip: int = 0, limit: int = 100) -> list[models.Review]:
    return db.query(models.Review).order_by(models.Review.created_at.desc()).offset(skip).limit(limit).all()

def get_review_by_id(db: Session, review_id: int) -> models.Review | None:
    return db.query(models.Review).filter(models.Review.id == review_id).first()

def get_user_by_id(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, email: str, hashed_password: str, full_name: str | None = None) -> models.User:
    db_user = models.User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

