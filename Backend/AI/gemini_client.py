"""
Google Gemini API client for PRGenie.

Provides ``GeminiClient`` — the single entry-point the backend team needs
to call.  Handles:
  - API key loading from ``.env``
  - Retry logic with exponential back-off
  - Rate-limit / quota error handling
  - Response parsing and validation
  - Configurable review mode (strict / balanced)
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

from .models import ReviewMode, ReviewResult, ResumeReviewResult
from .parser import parse_review_response, parse_resume_review_response
from .prompts import SYSTEM_PROMPT, build_review_prompt, RESUME_SYSTEM_PROMPT, build_resume_prompt

logger = logging.getLogger("prgenie.ai.client")

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

_DEFAULT_MODEL = "gemini-2.0-flash"
_MAX_RETRIES = 3
_INITIAL_BACKOFF_SECONDS = 2.0
_BACKOFF_MULTIPLIER = 2.0
_MAX_OUTPUT_TOKENS = 8192
_TEMPERATURE = 0.2  # low temperature → deterministic, structured output


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class GeminiClient:
    """
    High-level wrapper around the Google Gemini API for PR review.

    Usage
    -----
    >>> client = GeminiClient()                # reads GEMINI_API_KEY from .env
    >>> result = client.review_pr(diff_text)    # returns ReviewResult
    >>> print(result.to_dict())

    Parameters
    ----------
    api_key : str | None
        Gemini API key.  If *None*, loaded from the ``GEMINI_API_KEY``
        environment variable (via ``.env``).
    model : str
        Model name — defaults to ``gemini-2.0-flash``.
    max_retries : int
        Maximum number of retry attempts on transient failures.
    temperature : float
        Sampling temperature (0-2).  Lower = more deterministic.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = _DEFAULT_MODEL,
        max_retries: int = _MAX_RETRIES,
        temperature: float = _TEMPERATURE,
    ) -> None:
        # Load .env variables (idempotent if already loaded)
        load_dotenv()

        self._api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self._api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY not found. Set it in your .env file or pass it "
                "directly to GeminiClient(api_key=...)."
            )

        self._model = model
        self._max_retries = max_retries
        self._temperature = temperature

        # Initialise the Google GenAI client (API-key auth, NOT Vertex AI)
        self._client = genai.Client(api_key=self._api_key)

        logger.info("GeminiClient initialised (model=%s, retries=%d).", self._model, self._max_retries)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def review_pr(
        self,
        diff: str,
        *,
        mode: str = "balanced",
    ) -> ReviewResult:
        """
        Analyse a PR diff and return a structured review.

        Parameters
        ----------
        diff : str
            The unified diff text of the Pull Request.
        mode : str
            ``"strict"`` or ``"balanced"`` (default).

        Returns
        -------
        ReviewResult
            Validated, structured review.

        Raises
        ------
        RuntimeError
            If all retry attempts are exhausted.
        ValueError
            If the response cannot be parsed into valid JSON.
        """
        # Validate mode early
        _ = ReviewMode(mode)

        user_prompt = build_review_prompt(diff, mode=mode)
        raw_response = self._call_gemini_with_retries(user_prompt, system_instruction=SYSTEM_PROMPT)
        result = parse_review_response(raw_response)

        logger.info(
            "Review complete — %d total findings (%s mode).",
            result.total_findings,
            mode,
        )
        return result

    def review_resume(
        self,
        resume: str,
        job_description: str,
        *,
        mode: str = "balanced",
    ) -> ResumeReviewResult:
        """
        Analyze a candidate's resume against a job description.

        Parameters
        ----------
        resume : str
            The raw text of the candidate's resume.
        job_description : str
            The raw text of the job description.
        mode : str
            ``"strict"``, ``"balanced"`` (default), or ``"detailed"``.

        Returns
        -------
        ResumeReviewResult
            Validated, structured resume review.
        """
        _ = ReviewMode(mode)

        user_prompt = build_resume_prompt(resume, job_description, mode=mode)
        raw_response = self._call_gemini_with_retries(user_prompt, system_instruction=RESUME_SYSTEM_PROMPT)
        result = parse_resume_review_response(raw_response)

        logger.info(
            "Resume Review complete — Match: %d, ATS: %d (%s mode).",
            result.match_score,
            result.ats_score,
            mode,
        )
        return result

    def health_check(self) -> bool:
        """
        Verify that the API key is valid and the model is reachable.

        Returns ``True`` on success, raises on failure.
        """
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents="Reply with exactly: OK",
                config=types.GenerateContentConfig(
                    max_output_tokens=16,
                    temperature=0.0,
                ),
            )
            text = (response.text or "").strip()
            logger.info("Health check passed (response: %s).", text)
            return True
        except Exception as exc:
            logger.error("Health check failed: %s", exc)
            raise

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_gemini_with_retries(self, user_prompt: str, system_instruction: str) -> str:
        """
        Call Gemini with exponential back-off retries.

        Retries on:
          - google.api_core.exceptions.*  (rate-limit, server errors)
          - ConnectionError / TimeoutError
          - Any transient exception
        """
        backoff = _INITIAL_BACKOFF_SECONDS
        last_exception: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            try:
                logger.info("Gemini API call — attempt %d/%d.", attempt, self._max_retries)

                response = self._client.models.generate_content(
                    model=self._model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        max_output_tokens=_MAX_OUTPUT_TOKENS,
                        temperature=self._temperature,
                    ),
                )

                # --- Guard: blocked / empty response ---
                if not response.candidates:
                    logger.warning("Gemini returned no candidates (attempt %d).", attempt)
                    raise ValueError("Gemini returned an empty response (no candidates).")

                text = response.text
                if not text or not text.strip():
                    logger.warning("Gemini returned blank text (attempt %d).", attempt)
                    raise ValueError("Gemini returned blank text.")

                logger.debug("Raw Gemini response (first 300 chars): %s", text[:300])
                return text

            except Exception as exc:
                last_exception = exc
                logger.warning(
                    "Attempt %d/%d failed: %s — retrying in %.1fs.",
                    attempt,
                    self._max_retries,
                    exc,
                    backoff,
                )
                if attempt < self._max_retries:
                    time.sleep(backoff)
                    backoff *= _BACKOFF_MULTIPLIER

        raise RuntimeError(
            f"All {self._max_retries} Gemini API attempts failed. "
            f"Last error: {last_exception}"
        )
