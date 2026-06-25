"""
PRGenie AI Module — Google Gemini-powered Pull Request review engine.

This package provides:
  - gemini_client : Gemini Flash API integration with retry logic
  - prompts       : Prompt templates (SYSTEM / STRICT / BALANCED)
  - parser        : Response → validated Python dict conversion
  - models        : Pydantic models for structured review output
"""

from .models import Finding, ReviewResult, ResumeReviewResult, SectionFeedback
from .gemini_client import GeminiClient
from .parser import parse_review_response, parse_resume_review_response
from .prompts import SYSTEM_PROMPT, STRICT_PROMPT, BALANCED_PROMPT, DETAILED_PROMPT

__all__ = [
    "Finding",
    "ReviewResult",
    "ResumeReviewResult",
    "SectionFeedback",
    "GeminiClient",
    "parse_review_response",
    "parse_resume_review_response",
    "SYSTEM_PROMPT",
    "STRICT_PROMPT",
    "BALANCED_PROMPT",
    "DETAILED_PROMPT",
]
