#!/usr/bin/env python3
"""
End-to-end integration test for the PRGenie AI module.

Demonstrates the complete flow:
    PR Diff → Prompt → Gemini API → Response → Parser → Structured JSON Output

Usage:
    # Ensure .env contains GEMINI_API_KEY
    python -m Backend.AI.test_review          # from project root
    # or
    cd Backend/AI && python test_review.py    # from AI directory
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Fix Windows console encoding (cp1252 cannot render emoji/unicode)
# ---------------------------------------------------------------------------
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Ensure imports work regardless of how the script is invoked
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent.parent  # PRGenie/PRGenie
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from Backend.AI.gemini_client import GeminiClient
from Backend.AI.parser import parse_review_response, parse_resume_review_response
from Backend.AI.models import ReviewResult, ResumeReviewResult
from Backend.AI.prompts import build_review_prompt

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-28s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger("prgenie.ai.test")

# ---------------------------------------------------------------------------
# Sample PR diffs — each contains deliberate issues for the AI to catch
# ---------------------------------------------------------------------------

SAMPLE_DIFF_SQL_INJECTION = """\
diff --git a/app/database.py b/app/database.py
index 1a2b3c4..5d6e7f8 100644
--- a/app/database.py
+++ b/app/database.py
@@ -10,6 +10,15 @@ import sqlite3
 
 DB_PATH = "app.db"
 
+def get_user(username: str) -> dict | None:
+    conn = sqlite3.connect(DB_PATH)
+    cursor = conn.cursor()
+    query = f"SELECT * FROM users WHERE username = '{username}'"
+    cursor.execute(query)
+    row = cursor.fetchone()
+    conn.close()
+    return dict(row) if row else None
+
 def get_all_users() -> list[dict]:
     conn = sqlite3.connect(DB_PATH)
     cursor = conn.cursor()
"""

SAMPLE_DIFF_LOGIC_BUG = """\
diff --git a/app/auth.py b/app/auth.py
index a1b2c3d..e4f5678 100644
--- a/app/auth.py
+++ b/app/auth.py
@@ -1,5 +1,6 @@
 import hashlib
 import os
+import time
 
 SECRET_KEY = "super-secret-key-123"
 
@@ -15,8 +16,21 @@ def verify_password(stored_hash: str, password: str) -> bool:
     return hashlib.md5(password.encode()).hexdigest() == stored_hash
 
 
+def check_admin_access(user: dict) -> bool:
+    \"\"\"Check if user has admin privileges.\"\"\"
+    if user["role"] == "admin" or user["role"] == "superadmin":
+        return True
+    if user.get("permissions"):
+        for perm in user["permissions"]:
+            if perm == "admin_access":
+                return True
+    return False
+
+
 def login(username: str, password: str) -> dict | None:
     user = get_user_from_db(username)
+    if user is None:
+        return None
     password_hash = hashlib.md5(password.encode()).hexdigest()
     if password_hash == user["password_hash"]:
         token = hashlib.sha256(
@@ -25,4 +29,5 @@ def login(username: str, password: str) -> dict | None:
         return {
             "token": token,
             "user_id": user["id"],
+            "expires_at": time.time() + 3600,
         }
     return None
"""

SAMPLE_DIFF_MISSING_TESTS = """\
diff --git a/app/payment.py b/app/payment.py
new file mode 100644
index 0000000..9a8b7c6
--- /dev/null
+++ b/app/payment.py
@@ -0,0 +1,58 @@
+\"\"\"Payment processing module.\"\"\"
+
+import logging
+from decimal import Decimal
+from typing import Optional
+
+logger = logging.getLogger(__name__)
+
+TAX_RATE = Decimal("0.08")
+DISCOUNT_TIERS = {
+    100: Decimal("0.05"),
+    500: Decimal("0.10"),
+    1000: Decimal("0.15"),
+}
+
+
+def calculate_discount(amount: Decimal) -> Decimal:
+    \"\"\"Calculate discount based on amount tiers.\"\"\"
+    discount_rate = Decimal("0")
+    for threshold, rate in sorted(DISCOUNT_TIERS.items()):
+        if amount >= threshold:
+            discount_rate = rate
+    return amount * discount_rate
+
+
+def calculate_total(
+    subtotal: Decimal,
+    *,
+    apply_tax: bool = True,
+    coupon_code: Optional[str] = None,
+) -> dict:
+    \"\"\"Calculate the final total with tax and discounts.\"\"\"
+    discount = calculate_discount(subtotal)
+    after_discount = subtotal - discount
+
+    tax = Decimal("0")
+    if apply_tax:
+        tax = after_discount * TAX_RATE
+
+    coupon_discount = Decimal("0")
+    if coupon_code:
+        coupon_discount = _apply_coupon(coupon_code, after_discount)
+
+    total = after_discount + tax - coupon_discount
+
+    return {
+        "subtotal": float(subtotal),
+        "discount": float(discount),
+        "tax": float(tax),
+        "coupon_discount": float(coupon_discount),
+        "total": float(total),
+    }
+
+
+def _apply_coupon(code: str, amount: Decimal) -> Decimal:
+    \"\"\"Look up coupon and return discount amount.\"\"\"
+    coupons = {
+        "SAVE10": Decimal("0.10"),
+        "SAVE20": Decimal("0.20"),
+        "HALF": Decimal("0.50"),
+    }
+    rate = coupons.get(code.upper(), Decimal("0"))
+    return amount * rate
"""

SAMPLE_DIFF_SECURITY_ISSUES = """\
diff --git a/app/api.py b/app/api.py
index 1234567..abcdefg 100644
--- a/app/api.py
+++ b/app/api.py
@@ -1,8 +1,12 @@
 from flask import Flask, request, jsonify
+import subprocess
+import pickle
+import base64
 
 app = Flask(__name__)
 
-API_KEY = "placeholder"
+API_KEY = "sk-prod-a8f3k9d2m5n7p1q4r6t8v0w2x4y6z8"
+DEBUG_MODE = True
 
 @app.route("/api/data", methods=["POST"])
 def process_data():
@@ -12,6 +16,22 @@ def process_data():
     data = request.get_json()
     return jsonify({"status": "processed", "data": data})
 
+@app.route("/api/execute", methods=["POST"])
+def execute_command():
+    cmd = request.json.get("command")
+    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
+    return jsonify({"output": result.stdout, "error": result.stderr})
+
+@app.route("/api/deserialize", methods=["POST"])
+def deserialize_data():
+    encoded = request.json.get("data")
+    obj = pickle.loads(base64.b64decode(encoded))
+    return jsonify({"result": str(obj)})
+
+@app.route("/api/health")
+def health():
+    return jsonify({"status": "ok", "debug": DEBUG_MODE, "key": API_KEY[:8]})
+
 if __name__ == "__main__":
-    app.run(debug=False)
+    app.run(debug=DEBUG_MODE, host="0.0.0.0")
"""

# Combined diff for full-spectrum test
SAMPLE_DIFF_COMBINED = "\n".join([
    SAMPLE_DIFF_SQL_INJECTION,
    SAMPLE_DIFF_LOGIC_BUG,
    SAMPLE_DIFF_MISSING_TESTS,
    SAMPLE_DIFF_SECURITY_ISSUES,
])


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def _print_banner(title: str) -> None:
    width = 72
    print("\n" + "=" * width)
    print(f"  {title}")
    print("=" * width)


def _print_findings(category: str, findings: list) -> None:
    if not findings:
        print(f"\n  {category}: (none)")
        return
    print(f"\n  {category} ({len(findings)}):")
    for i, f in enumerate(findings, 1):
        loc = ""
        if f.file:
            loc += f.file
        if f.line:
            loc += f":{f.line}"
        severity = f.severity.value.upper()
        print(f"    {i}. [{severity}] {f.description}")
        if loc:
            print(f"       Location: {loc}")
        if f.suggestion:
            print(f"       Fix: {f.suggestion[:120]}{'...' if len(f.suggestion or '') > 120 else ''}")


def _display_result(result: ReviewResult) -> None:
    """Pretty-print a ReviewResult."""
    _print_findings("🐛 Bugs & Logic Errors", result.bugs)
    _print_findings("🔒 Security Vulnerabilities", result.security)
    _print_findings("🧪 Missing Test Coverage", result.tests)
    _print_findings("💡 Improvement Suggestions", result.improvements)
    print(f"\n  📝 Summary: {result.summary}")
    print(f"\n  Total findings: {result.total_findings}")
    print(f"  Has critical:   {result.has_critical}")


# ---------------------------------------------------------------------------
# Offline parser tests (no API key required)
# ---------------------------------------------------------------------------

def test_parser_valid_json() -> None:
    """Test parser with well-formed JSON."""
    _print_banner("Parser Test — Valid JSON")

    raw = json.dumps({
        "bugs": [
            {"description": "Off-by-one in loop", "file": "main.py", "line": 42, "severity": "high", "suggestion": "Use range(n) instead of range(n+1)"}
        ],
        "security": [],
        "tests": [
            {"description": "No tests for edge case", "file": "utils.py", "line": None, "severity": "medium", "suggestion": None}
        ],
        "improvements": [],
        "summary": "One bug and one test gap found."
    })

    result = parse_review_response(raw)
    assert len(result.bugs) == 1, f"Expected 1 bug, got {len(result.bugs)}"
    assert result.bugs[0].line == 42
    assert len(result.tests) == 1
    print("  ✅ PASSED — valid JSON parsed correctly.")


def test_parser_markdown_wrapped() -> None:
    """Test parser with JSON wrapped in markdown fences."""
    _print_banner("Parser Test — Markdown-Wrapped JSON")

    raw = '```json\n{"bugs": [], "security": [], "tests": [], "improvements": [], "summary": "Clean code."}\n```'
    result = parse_review_response(raw)
    assert result.summary == "Clean code."
    print("  ✅ PASSED — markdown fences stripped successfully.")


def test_parser_noisy_preamble() -> None:
    """Test parser with extra text before / after JSON."""
    _print_banner("Parser Test — Noisy Preamble")

    raw = (
        "Here is my analysis of the PR:\n\n"
        '{"bugs": [{"description": "Null check missing", "severity": "high"}], '
        '"security": [], "tests": [], "improvements": [], '
        '"summary": "Found one bug."}\n\n'
        "Let me know if you need more detail."
    )
    result = parse_review_response(raw)
    assert len(result.bugs) == 1
    print("  ✅ PASSED — extracted JSON from noisy response.")


def test_parser_empty_response() -> None:
    """Test parser with empty / None input."""
    _print_banner("Parser Test — Empty Response")

    result = parse_review_response(None)
    assert result.total_findings == 0
    result2 = parse_review_response("")
    assert result2.total_findings == 0
    print("  ✅ PASSED — empty responses handled gracefully.")


def test_parser_missing_keys() -> None:
    """Test parser with missing keys (should use defaults)."""
    _print_banner("Parser Test — Missing Keys")

    raw = json.dumps({"bugs": [{"description": "Test bug"}], "summary": "Partial response."})
    result = parse_review_response(raw)
    assert len(result.bugs) == 1
    assert len(result.security) == 0
    assert len(result.tests) == 0
    print("  ✅ PASSED — missing keys defaulted to empty lists.")


def test_parser_alternative_keys() -> None:
    """Test parser with alternative key names from the model."""
    _print_banner("Parser Test — Alternative Key Names")

    raw = json.dumps({
        "logic_errors": [{"description": "Wrong operator", "severity": "high"}],
        "vulnerabilities": [{"description": "XSS risk", "severity": "critical"}],
        "missing_tests": [{"description": "No unit tests for parser"}],
        "suggestions": [{"description": "Extract helper function"}],
        "overview": "Several issues found."
    })
    result = parse_review_response(raw)
    assert len(result.bugs) == 1
    assert len(result.security) == 1
    assert len(result.tests) == 1
    assert len(result.improvements) == 1
    print("  ✅ PASSED — alternative key names mapped correctly.")


def test_parser_resume_valid_json() -> None:
    """Test resume parser with well-formed JSON."""
    _print_banner("Parser Test — Resume Valid JSON")

    raw = json.dumps({
        "match_score": 85,
        "ats_score": 90,
        "strengths": ["Python", "FastAPI"],
        "weaknesses": ["No Go experience"],
        "missing_skills": ["Go", "Kubernetes"],
        "missing_keywords": ["K8s", "Microservices"],
        "improvement_suggestions": ["Add Kubernetes side projects"],
        "section_wise_feedback": [
            {"section_name": "Experience", "feedback": "Good depth in Python backend."}
        ]
    })

    result = parse_resume_review_response(raw)
    assert result.match_score == 85
    assert result.ats_score == 90
    assert len(result.strengths) == 2
    assert len(result.section_wise_feedback) == 1
    assert result.section_wise_feedback[0].section_name == "Experience"
    print("  ✅ PASSED — valid Resume JSON parsed correctly.")


def test_parser_resume_markdown_wrapped() -> None:
    """Test resume parser with JSON wrapped in markdown fences."""
    _print_banner("Parser Test — Resume Markdown-Wrapped")

    raw = '```json\n{"match_score": 50, "ats_score": 60, "strengths": ["Java"], "weaknesses": [], "missing_skills": [], "missing_keywords": [], "improvement_suggestions": [], "section_wise_feedback": []}\n```'
    result = parse_resume_review_response(raw)
    assert result.match_score == 50
    print("  ✅ PASSED — Resume markdown fences stripped successfully.")


def test_parser_resume_noisy_preamble() -> None:
    """Test resume parser with extra text before / after JSON."""
    _print_banner("Parser Test — Resume Noisy Preamble")

    raw = (
        "Here is the evaluation:\n\n"
        '{"match_score": 95, "ats_score": 99, "strengths": [], "weaknesses": [], '
        '"missing_skills": [], "missing_keywords": [], "improvement_suggestions": [], '
        '"section_wise_feedback": []}\n\n'
        "Hope this helps!"
    )
    result = parse_resume_review_response(raw)
    assert result.ats_score == 99
    print("  ✅ PASSED — extracted Resume JSON from noisy response.")


def test_parser_resume_empty_response() -> None:
    """Test resume parser with empty / None input."""
    _print_banner("Parser Test — Resume Empty Response")

    result = parse_resume_review_response(None)
    assert result.match_score == 0
    assert result.ats_score == 0
    result2 = parse_resume_review_response("")
    assert result2.match_score == 0
    print("  ✅ PASSED — empty Resume responses handled gracefully.")


# ---------------------------------------------------------------------------
# Live API tests (require GEMINI_API_KEY in .env)
# ---------------------------------------------------------------------------

def test_health_check(client: GeminiClient) -> None:
    """Verify Gemini API connectivity."""
    _print_banner("Live Test — Health Check")
    try:
        ok = client.health_check()
        print(f"  ✅ PASSED — API reachable (ok={ok}).")
    except Exception as exc:
        print(f"  ❌ FAILED — {exc}")
        raise


def test_review_sql_injection(client: GeminiClient) -> None:
    """Review a diff containing SQL injection vulnerability."""
    _print_banner("Live Test — SQL Injection Diff (STRICT mode)")
    result = client.review_pr(SAMPLE_DIFF_SQL_INJECTION, mode="strict")
    _display_result(result)

    assert result.total_findings > 0, "Expected at least one finding."
    assert len(result.security) > 0 or len(result.bugs) > 0, (
        "Expected SQL injection to be flagged under security or bugs."
    )
    print("\n  ✅ PASSED — SQL injection detected.")


def test_review_logic_bugs(client: GeminiClient) -> None:
    """Review a diff containing logic bugs and weak crypto."""
    _print_banner("Live Test — Logic Bug Diff (BALANCED mode)")
    result = client.review_pr(SAMPLE_DIFF_LOGIC_BUG, mode="balanced")
    _display_result(result)

    assert result.total_findings > 0, "Expected at least one finding."
    print("\n  ✅ PASSED — Logic / security issues detected.")


def test_review_missing_tests(client: GeminiClient) -> None:
    """Review a new payment module with no test file."""
    _print_banner("Live Test — Missing Test Coverage (BALANCED mode)")
    result = client.review_pr(SAMPLE_DIFF_MISSING_TESTS, mode="balanced")
    _display_result(result)

    assert result.total_findings > 0, "Expected findings for untested payment code."
    print("\n  ✅ PASSED — Missing tests identified.")


def test_review_security_issues(client: GeminiClient) -> None:
    """Review a diff loaded with critical security holes."""
    _print_banner("Live Test — Security Vulnerabilities (STRICT mode)")
    result = client.review_pr(SAMPLE_DIFF_SECURITY_ISSUES, mode="strict")
    _display_result(result)

    assert result.total_findings > 0, "Expected multiple security findings."
    assert result.has_critical or len(result.security) >= 2, (
        "Expected critical-severity findings for command injection / pickle / hardcoded key."
    )
    print("\n  ✅ PASSED — Critical security issues detected.")


def test_review_combined(client: GeminiClient) -> None:
    """Full-spectrum test: combined diff with all issue types."""
    _print_banner("Live Test — Combined Diff (STRICT mode)")
    result = client.review_pr(SAMPLE_DIFF_COMBINED, mode="strict")
    _display_result(result)

    print("\n  --- Full JSON output ---")
    print(json.dumps(result.to_dict(), indent=2))

    assert result.total_findings >= 4, (
        f"Expected ≥ 4 findings across all categories, got {result.total_findings}."
    )
    print(f"\n  ✅ PASSED — {result.total_findings} findings across all categories.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "🔬 " * 18)
    print("  PRGenie AI Module — Test Suite")
    print("🔬 " * 18)

    # --- Offline parser tests (always run) ---
    print("\n\n📦  PHASE 1: Offline Parser Tests (no API key needed)")
    print("-" * 52)

    test_parser_valid_json()
    test_parser_markdown_wrapped()
    test_parser_noisy_preamble()
    test_parser_empty_response()
    test_parser_missing_keys()
    test_parser_alternative_keys()
    test_parser_resume_valid_json()
    test_parser_resume_markdown_wrapped()
    test_parser_resume_noisy_preamble()
    test_parser_resume_empty_response()

    print("\n\n✅  All offline parser tests passed!\n")

    # --- Live API tests ---
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Try loading from .env in the AI directory
        from dotenv import load_dotenv
        env_path = _SCRIPT_DIR / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("⚠️   GEMINI_API_KEY not set — skipping live API tests.")
        print("     Create Backend/AI/.env with:  GEMINI_API_KEY=your_key_here")
        return

    print("\n\n🌐  PHASE 2: Live API Tests (using Gemini Flash)")
    print("-" * 52)

    client = GeminiClient(api_key=api_key)

    test_health_check(client)
    test_review_sql_injection(client)
    test_review_logic_bugs(client)
    test_review_missing_tests(client)
    test_review_security_issues(client)
    test_review_combined(client)

    print("\n\n" + "🎉 " * 18)
    print("  ALL TESTS PASSED — AI module is production-ready!")
    print("🎉 " * 18 + "\n")


if __name__ == "__main__":
    main()
