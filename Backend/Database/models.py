from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from .database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    repo_full_name = Column(String, index=True, nullable=False)
    pr_number = Column(Integer, nullable=False)
    pr_title = Column(String, nullable=True)
    pr_author = Column(String, nullable=True)
    pr_url = Column(String, nullable=True)
    review_text = Column(Text, nullable=True)
    bugs_found = Column(Integer, default=0)
    security_issues = Column(Integer, default=0)
    status = Column(String, default="pending")  # "pending", "complete", "error"
    created_at = Column(DateTime, default=datetime.utcnow)
