"""
Response parser for Gemini API output.

Converts raw Gemini text responses into validated ``ReviewResult`` objects.
Handles all common failure modes:
  - Markdown-wrapped JSON  (```json ... ```)
  - Trailing / leading whitespace
  - Invalid JSON syntax
  - Missing or extra keys
  - Empty or None responses
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from .models import Finding, ReviewResult, Severity, ResumeReviewResult, SectionFeedback

logger = logging.getLogger("prgenie.ai.parser")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_review_response(raw: str | None) -> ReviewResult:
    """
    Parse a raw Gemini response string into a validated ``ReviewResult``.

    Parameters
    ----------
    raw : str | None
        The raw text returned by the Gemini API.

    Returns
    -------
    ReviewResult
        A fully validated review object.

    Raises
    ------
    ValueError
        If the response cannot be parsed after all recovery attempts.
    """
    if not raw or not raw.strip():
        logger.warning("Received empty response from Gemini — returning empty review.")
        return ReviewResult(summary="The AI returned an empty response. No findings to report.")

    cleaned = _strip_markdown_fences(raw.strip())

    # --- Attempt 1: direct parse ---
    data = _try_parse_json(cleaned)

    # --- Attempt 2: extract first JSON object from noisy output ---
    if data is None:
        data = _extract_first_json_object(cleaned)

    # --- Attempt 3: line-by-line brace matching ---
    if data is None:
        data = _brace_match_extract(raw)

    if data is None:
        raise ValueError(
            f"Failed to parse Gemini response as JSON. "
            f"Raw response (first 500 chars): {raw[:500]}"
        )

    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object at top level, got {type(data).__name__}.")

    return _dict_to_review_result(data)


def parse_resume_review_response(raw: str | None) -> ResumeReviewResult:
    """
    Parse a raw Gemini response string into a validated ``ResumeReviewResult``.

    Parameters
    ----------
    raw : str | None
        The raw text returned by the Gemini API.

    Returns
    -------
    ResumeReviewResult
        A fully validated resume review object.

    Raises
    ------
    ValueError
        If the response cannot be parsed after all recovery attempts.
    """
    if not raw or not raw.strip():
        logger.warning("Received empty response from Gemini for Resume — returning empty review.")
        return ResumeReviewResult(
            match_score=0,
            ats_score=0,
            strengths=[],
            weaknesses=[],
            missing_skills=[],
            missing_keywords=[],
            improvement_suggestions=[],
            section_wise_feedback=[],
        )

    cleaned = _strip_markdown_fences(raw.strip())

    data = _try_parse_json(cleaned)
    if data is None:
        data = _extract_first_json_object(cleaned)
    if data is None:
        data = _brace_match_extract(raw)

    if data is None:
        raise ValueError(
            f"Failed to parse Gemini response as JSON for Resume. "
            f"Raw response (first 500 chars): {raw[:500]}"
        )

    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object at top level, got {type(data).__name__}.")

    return _dict_to_resume_review_result(data)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrapping."""
    # Multi-line pattern: ```json\n...\n``` or ```\n...\n```
    pattern = r"^```(?:json)?\s*\n?(.*?)\n?\s*```$"
    match = re.match(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _try_parse_json(text: str) -> dict | None:
    """Attempt a direct ``json.loads``; return None on failure."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


def _extract_first_json_object(text: str) -> dict | None:
    """
    Scan *text* for the first ``{ ... }`` substring and try to parse it.

    Uses a simple brace-depth counter that respects string literals.
    """
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False

    for i in range(start, len(text)):
        ch = text[i]

        if escape:
            escape = False
            continue

        if ch == "\\":
            escape = True
            continue

        if ch == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                result = _try_parse_json(candidate)
                if result is not None:
                    return result

    return None


def _brace_match_extract(text: str) -> dict | None:
    """
    Last-resort extraction: try every line that starts with ``{`` and
    accumulate until braces balance.
    """
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("{"):
            candidate = "\n".join(lines[idx:])
            result = _extract_first_json_object(candidate)
            if result is not None:
                return result
    return None


def _normalise_severity(raw_severity: Any) -> Severity:
    """Map an arbitrary severity string to the ``Severity`` enum."""
    if isinstance(raw_severity, Severity):
        return raw_severity

    mapping = {
        "critical": Severity.CRITICAL,
        "high": Severity.HIGH,
        "medium": Severity.MEDIUM,
        "med": Severity.MEDIUM,
        "low": Severity.LOW,
        "info": Severity.INFO,
        "informational": Severity.INFO,
        "warning": Severity.MEDIUM,
        "warn": Severity.MEDIUM,
        "error": Severity.HIGH,
    }
    key = str(raw_severity).strip().lower()
    return mapping.get(key, Severity.MEDIUM)


def _parse_finding(raw: Any) -> Finding | None:
    """
    Coerce a raw dict (or string) into a ``Finding``.

    Returns ``None`` for completely unparseable items so the caller can
    skip them gracefully.
    """
    if isinstance(raw, str):
        # The model sometimes returns a plain string instead of an object.
        return Finding(description=raw)

    if not isinstance(raw, dict):
        logger.warning("Skipping non-dict finding: %s", type(raw).__name__)
        return None

    description = raw.get("description") or raw.get("message") or raw.get("issue") or ""
    if not description:
        logger.warning("Skipping finding with empty description.")
        return None

    # Robustly parse the line number
    line_raw = raw.get("line")
    line: int | None = None
    if line_raw is not None:
        try:
            line = int(line_raw)
            if line < 1:
                line = None
        except (ValueError, TypeError):
            line = None

    return Finding(
        description=str(description),
        file=raw.get("file") or raw.get("filename") or raw.get("path"),
        line=line,
        severity=_normalise_severity(raw.get("severity", "medium")),
        suggestion=raw.get("suggestion") or raw.get("fix") or raw.get("recommendation"),
    )


def _parse_findings_list(raw_list: Any) -> list[Finding]:
    """Parse a list of raw findings, skipping invalid entries."""
    if not isinstance(raw_list, list):
        if isinstance(raw_list, dict):
            # Single finding supplied as a dict instead of a list
            f = _parse_finding(raw_list)
            return [f] if f else []
        return []

    findings: list[Finding] = []
    for item in raw_list:
        f = _parse_finding(item)
        if f is not None:
            findings.append(f)
    return findings


def _dict_to_review_result(data: dict) -> ReviewResult:
    """
    Build a ``ReviewResult`` from a raw dict, tolerating missing keys and
    alternative key names.
    """
    bugs = _parse_findings_list(
        data.get("bugs") or data.get("bug") or data.get("logic_errors") or []
    )
    security = _parse_findings_list(
        data.get("security") or data.get("security_vulnerabilities") or data.get("vulnerabilities") or []
    )
    tests = _parse_findings_list(
        data.get("tests") or data.get("test_coverage") or data.get("missing_tests") or []
    )
    improvements = _parse_findings_list(
        data.get("improvements") or data.get("suggestions") or data.get("refactoring") or []
    )
    summary = str(
        data.get("summary") or data.get("overview") or data.get("conclusion") or ""
    )

    result = ReviewResult(
        bugs=bugs,
        security=security,
        tests=tests,
        improvements=improvements,
        summary=summary,
    )

    logger.info(
        "Parsed review: %d bugs, %d security, %d tests, %d improvements.",
        len(result.bugs),
        len(result.security),
        len(result.tests),
        len(result.improvements),
    )
    return result


def _dict_to_resume_review_result(data: dict) -> ResumeReviewResult:
    """
    Build a ``ResumeReviewResult`` from a raw dict, tolerating missing keys.
    """
    def _get_int(key: str, default: int = 0) -> int:
        val = data.get(key)
        if isinstance(val, (int, float)):
            return int(val)
        if isinstance(val, str):
            try:
                return int(val.strip())
            except ValueError:
                pass
        return default

    def _get_list_str(key: str) -> list[str]:
        val = data.get(key)
        if isinstance(val, list):
            return [str(i) for i in val if i]
        return []

    raw_sections = data.get("section_wise_feedback") or []
    section_wise_feedback = []
    if isinstance(raw_sections, list):
        for sec in raw_sections:
            if isinstance(sec, dict):
                section_name = sec.get("section_name") or sec.get("section") or "General"
                feedback = sec.get("feedback") or sec.get("comments") or ""
                if feedback:
                    section_wise_feedback.append(SectionFeedback(
                        section_name=str(section_name),
                        feedback=str(feedback)
                    ))

    result = ResumeReviewResult(
        match_score=_get_int("match_score"),
        ats_score=_get_int("ats_score"),
        strengths=_get_list_str("strengths"),
        weaknesses=_get_list_str("weaknesses"),
        missing_skills=_get_list_str("missing_skills"),
        missing_keywords=_get_list_str("missing_keywords"),
        improvement_suggestions=_get_list_str("improvement_suggestions"),
        section_wise_feedback=section_wise_feedback,
    )

    logger.info(
        "Parsed resume review: match_score=%d, ats_score=%d.",
        result.match_score,
        result.ats_score,
    )
    return result
