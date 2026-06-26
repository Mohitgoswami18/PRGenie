# PRGenie AI Module 🤖🧠

> **Standalone AI/ML engine for PR code review** — powered by Google Gemini Flash.

This module analyses GitHub Pull Request diffs AND candidate Resumes, producing structured,
actionable JSON reviews across two main features:

### 1. PR Code Review

| Pillar | Emoji | What it catches |
|--------|-------|-----------------|
| Bugs & Logic Errors | 🐛 | Off-by-one, null deref, broken control flow |
| Security Vulnerabilities | 🔒 | SQL injection, hardcoded secrets, command injection |
| Missing Test Coverage | 🧪 | Untested public functions, edge cases, critical paths |
| Improvement Suggestions | 💡 | Refactoring ideas, performance, readability |

### 2. Resume vs Job Description Matcher

| Feature | What it provides |
|---------|-----------------|
| Match & ATS Scoring | 💯 | 0-100 scores for overall match and ATS compatibility |
| Strengths & Weaknesses | ⚖️ | Key alignments and gaps against the JD |
| Missing Skills/Keywords | 🔍 | Exact skills or keywords the candidate is missing |
| Section-wise Feedback | 📝 | Granular feedback for Experience, Education, etc. |

---

## Architecture

```
PR Diff (string)
      │
      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  prompts.py  │────▶│ gemini_client│────▶│  Gemini API  │
│  (template)  │     │   .py        │     │  (Flash)     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                    │
                            │   raw JSON text    │
                            ◀────────────────────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  parser.py   │────▶│  models.py   │
                     │  (validate)  │     │  (Pydantic)  │
                     └──────────────┘     └──────────────┘
                            │
                            ▼
                    ReviewResult (dict)
```

### Files

| File | Purpose |
|------|---------|
| `models.py` | Pydantic models — `Finding`, `ReviewResult`, `Severity` enum |
| `prompts.py` | `SYSTEM_PROMPT`, `STRICT_PROMPT`, `BALANCED_PROMPT` + builder |
| `gemini_client.py` | `GeminiClient` — Gemini Flash integration with retry logic |
| `parser.py` | Raw-text → validated `ReviewResult` conversion |
| `test_review.py` | End-to-end test suite (offline parser + live API tests) |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for environment variables |

---

## Quick Start

### 1. Install dependencies

```bash
cd Backend/AI
pip install -r requirements.txt
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Then open `.env` and paste your Gemini API key:

```
GEMINI_API_KEY=your_actual_key_here
```

> 🔑 Get your API key from **[Google AI Studio](https://aistudio.google.com/apikey)** (free tier available).

### 3. Run the test suite

```bash
# From the project root (PRGenie/)
python -m Backend.AI.test_review

# Or from the AI directory
cd Backend/AI
python test_review.py
```

The test suite runs in two phases:
1. **Offline parser tests** — always run, no API key needed
2. **Live API tests** — require `GEMINI_API_KEY`, call Gemini Flash with sample diffs

---

## Usage (for Backend Team)

### Basic integration

```python
from Backend.AI import GeminiClient

# Initialise (reads GEMINI_API_KEY from .env automatically)
client = GeminiClient()

# Review a PR diff
result = client.review_pr(diff_text, mode="balanced")

# Access structured results
print(result.bugs)           # list[Finding]
print(result.security)       # list[Finding]
print(result.tests)          # list[Finding]
print(result.improvements)   # list[Finding]
print(result.summary)        # str

# Convert to JSON dict for API response
json_response = result.to_dict()
```

### Resume Review integration

```python
from Backend.AI import GeminiClient

client = GeminiClient()

# Review a Resume against a Job Description
resume_text = "John Doe\\nPython Developer\\n..."
jd_text = "Looking for a Senior Backend Engineer..."

result = client.review_resume(resume_text, jd_text, mode="detailed")

print(f"Match Score: {result.match_score}/100")
print(f"ATS Score: {result.ats_score}/100")
print(result.missing_skills)      # list[str]
print(result.section_wise_feedback) # list[SectionFeedback]

# Convert to JSON dict for API response
json_response = result.to_dict()
```

### Review modes

| Mode | Use case |
|------|----------|
| `"balanced"` (default) | Practical review — focuses on real-world impact and realistic expectations. |
| `"strict"` | Zero-tolerance — docks points heavily for missing requirements, flags everything. |
| `"detailed"` | Educational and granular — explains the "why", gives extensive step-by-step feedback. |

```python
# Strict mode for security-critical repos
result = client.review_pr(diff, mode="strict")

# Balanced mode for general-purpose review
result = client.review_pr(diff, mode="balanced")
```

### Health check

```python
client = GeminiClient()
is_healthy = client.health_check()  # True if API is reachable
```

### Output format

```json
{
  "bugs": [
    {
      "description": "Password comparison uses == instead of constant-time compare",
      "file": "auth.py",
      "line": 16,
      "severity": "high",
      "suggestion": "Use hmac.compare_digest() instead of =="
    }
  ],
  "security": [...],
  "tests": [...],
  "improvements": [...],
  "summary": "Found 3 bugs, 2 security issues, and 4 test gaps..."
}
```

### Using the parser standalone

```python
from Backend.AI import parse_review_response, parse_resume_review_response

# Parse raw Gemini output for PR review
pr_result = parse_review_response(raw_gemini_text)

# Parse raw Gemini output for Resume review
resume_result = parse_resume_review_response(raw_resume_text)
```

---

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | API key from [Google AI Studio](https://aistudio.google.com/apikey) |

### `GeminiClient` constructor options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | `None` (reads from `.env`) | Gemini API key |
| `model` | `gemini-2.0-flash` | Gemini model to use |
| `max_retries` | `3` | Retry attempts on transient failures |
| `temperature` | `0.2` | Sampling temperature (lower = more deterministic) |

---

## Error Handling

The module handles these failure modes:

| Scenario | Behaviour |
|----------|-----------|
| Missing API key | Raises `EnvironmentError` with clear instructions |
| API rate limit | Retries with exponential backoff (2s → 4s → 8s) |
| Network timeout | Retries up to `max_retries` times |
| Invalid JSON response | Parser strips markdown fences, extracts JSON from noise |
| Empty response | Returns `ReviewResult` with empty lists and warning summary |
| Blocked content | Retries; surfaces error if all attempts fail |
| Missing JSON keys | Defaults to empty lists; maps alternative key names |

---

## Tech Stack

- **Python** 3.12+
- **Google Gemini** API (`google-genai` SDK) — API key auth via AI Studio
- **Pydantic** v2 — data validation and serialization
- **python-dotenv** — `.env` file loading

> ⚠️ This module uses **Google AI Studio API keys only**.  
> It does **NOT** use Google Cloud Vertex AI, AWS Bedrock, Anthropic, or OpenAI.

---

## Module Boundary

This module is **self-contained**. It does NOT include:
- ❌ Frontend code
- ❌ FastAPI routes / endpoints
- ❌ Database models or migrations
- ❌ GitHub webhook handlers
- ❌ Deployment configuration

The backend team integrates by calling `GeminiClient.review_pr(diff)` and receives a `ReviewResult` (or `dict` via `.to_dict()`).
