"""
Pydantic models for structured PR review output.

These models enforce the JSON contract between the AI module and the
backend / frontend layers.  Every Gemini response is validated against
these schemas before being returned.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Severity(str, Enum):
    """Severity level for a single finding."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ReviewMode(str, Enum):
    """Prompt mode used for the review."""
    STRICT = "strict"
    BALANCED = "balanced"
    DETAILED = "detailed"


# ---------------------------------------------------------------------------
# Finding — a single item inside any category
# ---------------------------------------------------------------------------

class Finding(BaseModel):
    """Represents one issue / suggestion discovered in the PR diff."""

    description: str = Field(
        ...,
        min_length=1,
        description="Clear, actionable description of the finding.",
    )
    file: Optional[str] = Field(
        default=None,
        description="Relative path to the file where the issue was found.",
    )
    line: Optional[int] = Field(
        default=None,
        ge=1,
        description="Line number in the diff (1-based).",
    )
    severity: Severity = Field(
        default=Severity.MEDIUM,
        description="Severity of the finding.",
    )
    suggestion: Optional[str] = Field(
        default=None,
        description="Concrete fix or improvement suggestion with example code.",
    )


# ---------------------------------------------------------------------------
# ReviewResult — the top-level review object
# ---------------------------------------------------------------------------

class ReviewResult(BaseModel):
    """
    Complete structured review produced by the AI module.

    This is the single object the backend team should expect when they
    call  ``GeminiClient.review_pr(diff)``  or  ``parse_review_response(raw)``.
    """

    bugs: list[Finding] = Field(
        default_factory=list,
        description="Bugs and logic errors discovered in the diff.",
    )
    security: list[Finding] = Field(
        default_factory=list,
        description="Security vulnerabilities discovered in the diff.",
    )
    tests: list[Finding] = Field(
        default_factory=list,
        description="Missing test coverage gaps.",
    )
    improvements: list[Finding] = Field(
        default_factory=list,
        description="Improvement and refactoring suggestions.",
    )
    summary: str = Field(
        default="",
        description="Human-readable summary of all findings.",
    )

    # -- convenience helpers ------------------------------------------------

    @property
    def total_findings(self) -> int:
        """Total number of findings across all categories."""
        return len(self.bugs) + len(self.security) + len(self.tests) + len(self.improvements)

    @property
    def has_critical(self) -> bool:
        """Return True if any finding is marked critical."""
        all_findings = self.bugs + self.security + self.tests + self.improvements
        return any(f.severity == Severity.CRITICAL for f in all_findings)

    def to_dict(self) -> dict:
        """Serialise to a plain dict (JSON-safe)."""
        return self.model_dump(mode="json")


# ---------------------------------------------------------------------------
# Resume Review Models
# ---------------------------------------------------------------------------

class SectionFeedback(BaseModel):
    """Feedback for a specific section of the resume."""

    section_name: str = Field(
        ...,
        description="Name of the section (e.g., 'Experience', 'Education', 'Skills').",
    )
    feedback: str = Field(
        ...,
        description="Detailed feedback and suggestions for this section.",
    )


class ResumeReviewResult(BaseModel):
    """
    Complete structured review of a Resume against a Job Description.
    """

    match_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall match score out of 100.",
    )
    ats_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Estimated ATS (Applicant Tracking System) compatibility score out of 100.",
    )
    strengths: list[str] = Field(
        default_factory=list,
        description="Key strengths of the resume for this role.",
    )
    weaknesses: list[str] = Field(
        default_factory=list,
        description="Key weaknesses or gaps in the resume.",
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Important skills mentioned in the JD but missing from the resume.",
    )
    missing_keywords: list[str] = Field(
        default_factory=list,
        description="Important keywords from the JD missing from the resume.",
    )
    improvement_suggestions: list[str] = Field(
        default_factory=list,
        description="Actionable suggestions to improve the resume.",
    )
    section_wise_feedback: list[SectionFeedback] = Field(
        default_factory=list,
        description="Detailed feedback broken down by resume section.",
    )

    def to_dict(self) -> dict:
        """Serialise to a plain dict (JSON-safe)."""
        return self.model_dump(mode="json")
