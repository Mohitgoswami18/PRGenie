import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Fix import paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from Backend.Database.database import Base, get_db
from Backend.main import app
from Backend.AI.models import ReviewResult, Finding

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_prgenie.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Overwrite the production database session and engine with test ones
        from Backend.Database import database as db_mod
        db_mod.SessionLocal = TestingSessionLocal
        db_mod.engine = engine

        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        import os
        if os.path.exists("./test_prgenie.db"):
            try:
                os.remove("./test_prgenie.db")
            except OSError:
                pass

    def setUp(self):
        # Clean db tables between tests if needed, but recreate for simplicity
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    @patch("Backend.main.GeminiClient")
    @patch("Backend.main.github_client")
    def test_webhook_flow(self, mock_github, mock_gemini_client_cls):
        # Configure GitHub and Gemini mocks
        mock_github.fetch_diff.return_value = "diff --git a/test.py b/test.py\n+print('hello')"
        
        mock_gemini_instance = MagicMock()
        mock_gemini_client_cls.return_value = mock_gemini_instance
        
        mock_review_result = ReviewResult(
            bugs=[Finding(description="Null pointer error", file="test.py", line=1, severity="critical", suggestion="Fix it")],
            security=[],
            tests=[],
            improvements=[],
            summary="Tested review."
        )
        mock_gemini_instance.review_pr.return_value = mock_review_result

        # Webhook payload
        payload = {
            "action": "opened",
            "number": 42,
            "pull_request": {
                "title": "Fix login bug",
                "html_url": "https://github.com/myteam/my-repo/pull/42",
                "user": {"login": "alice"},
                "diff_url": "https://github.com/myteam/my-repo/pull/42.diff"
            },
            "repository": {
                "full_name": "myteam/my-repo"
            }
        }

        # Call webhook
        headers = {"X-GitHub-Event": "pull_request"}
        response = self.client.post("/webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "accepted")

        # Verify review in database via GET /api/reviews
        reviews_response = self.client.get("/api/reviews")
        self.assertEqual(reviews_response.status_code, 200)
        reviews_data = reviews_response.json()["reviews"]
        self.assertEqual(len(reviews_data), 1)
        
        review = reviews_data[0]
        self.assertEqual(review["repo_full_name"], "myteam/my-repo")
        self.assertEqual(review["pr_number"], 42)
        self.assertEqual(review["pr_title"], "Fix login bug")
        self.assertEqual(review["pr_author"], "alice")
        self.assertEqual(review["status"], "complete")
        self.assertEqual(review["bugs_found"], 1)
        self.assertEqual(review["security_issues"], 0)
        self.assertTrue("AutoReview AI PR Feedback" in review["review_text"])
        self.assertTrue("Null pointer error" in review["review_text"])
        
        # Test specific GET by ID
        review_id = review["id"]
        detail_response = self.client.get(f"/api/reviews/{review_id}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["id"], review_id)

    @patch("Backend.main.GeminiClient")
    @patch("Backend.main.github_client")
    def test_webhook_error_handling(self, mock_github, mock_gemini_client_cls):
        # Configure GitHub to raise exception to test error workflow
        mock_github.fetch_diff.side_effect = Exception("GitHub Timeout")
        
        payload = {
            "action": "opened",
            "number": 101,
            "pull_request": {
                "title": "Error test",
                "html_url": "https://github.com/myteam/my-repo/pull/101",
                "user": {"login": "bob"},
                "diff_url": "https://github.com/myteam/my-repo/pull/101.diff"
            },
            "repository": {
                "full_name": "myteam/my-repo"
            }
        }

        headers = {"X-GitHub-Event": "pull_request"}
        response = self.client.post("/webhook", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        
        # Check review is marked as error
        reviews_response = self.client.get("/api/reviews")
        self.assertEqual(reviews_response.status_code, 200)
        reviews_data = reviews_response.json()["reviews"]
        self.assertEqual(len(reviews_data), 1)
        self.assertEqual(reviews_data[0]["status"], "error")
        self.assertTrue("GitHub Timeout" in reviews_data[0]["review_text"])

    def test_user_registration_and_login_flow(self):
        # 1. Register a new user
        reg_payload = {
            "email": "user@example.com",
            "password": "mypassword123",
            "full_name": "John Doe"
        }
        reg_response = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(reg_response.status_code, 200)
        reg_data = reg_response.json()
        self.assertEqual(reg_data["email"], "user@example.com")
        self.assertEqual(reg_data["full_name"], "John Doe")
        self.assertIn("id", reg_data)
        self.assertIn("created_at", reg_data)

        # 2. Registering same email again should fail
        dup_response = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(dup_response.status_code, 400)
        self.assertEqual(dup_response.json()["detail"], "Email already registered")

        # 3. Login with correct credentials
        login_data = {
            "username": "user@example.com",
            "password": "mypassword123"
        }
        login_response = self.client.post("/api/auth/login", data=login_data)
        self.assertEqual(login_response.status_code, 200)
        token_data = login_response.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        token = token_data["access_token"]

        # 4. Login with incorrect credentials
        bad_login_data = {
            "username": "user@example.com",
            "password": "wrongpassword"
        }
        bad_login_response = self.client.post("/api/auth/login", data=bad_login_data)
        self.assertEqual(bad_login_response.status_code, 401)

        # 5. Access protected /api/auth/me endpoint
        headers = {"Authorization": f"Bearer {token}"}
        me_response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_response.status_code, 200)
        me_data = me_response.json()
        self.assertEqual(me_data["email"], "user@example.com")
        self.assertEqual(me_data["full_name"], "John Doe")

        # 6. Access /api/auth/me with invalid token
        bad_headers = {"Authorization": "Bearer invalidtoken123"}
        bad_me_response = self.client.get("/api/auth/me", headers=bad_headers)
        self.assertEqual(bad_me_response.status_code, 401)

        # 7. Access /api/auth/me without token
        no_token_response = self.client.get("/api/auth/me")
        self.assertEqual(no_token_response.status_code, 401)

    def test_stats_endpoint(self):
        # 1. Fetch initial stats (should be empty/0s)
        response = self.client.get("/api/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_reviews"], 0)
        self.assertEqual(data["bugs_caught"], 0)
        self.assertEqual(data["security_issues_prevented"], 0)
        self.assertEqual(data["avg_review_time"], "0.0s")

    @patch("Backend.main.GeminiClient")
    @patch("Backend.main.github_client")
    def test_analyze_endpoint(self, mock_github, mock_gemini_client_cls):
        # Configure GitHub metadata and diff mocks
        mock_github.parse_pr_url.return_value = ("owner/repo", 42)
        mock_github.fetch_pr_metadata.return_value = {
            "title": "Add new landing page",
            "user": {"login": "jane_developer"},
            "html_url": "https://github.com/owner/repo/pull/42",
            "diff_url": "https://github.com/owner/repo/pull/42.diff"
        }
        mock_github.fetch_diff.return_value = "diff --git a/app.py b/app.py\n+print('hello')"

        mock_gemini_instance = MagicMock()
        mock_gemini_client_cls.return_value = mock_gemini_instance
        mock_review_result = ReviewResult(
            bugs=[],
            security=[],
            tests=[],
            improvements=[],
            summary="Clean code, looks good."
        )
        mock_gemini_instance.review_pr.return_value = mock_review_result

        # Request body
        payload = {"pr_url": "https://github.com/owner/repo/pull/42"}
        response = self.client.post("/api/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "accepted")
        self.assertIn("review_id", response.json())

        # Check that review record is in database
        reviews_response = self.client.get("/api/reviews")
        reviews_data = reviews_response.json()["reviews"]
        self.assertEqual(len(reviews_data), 1)
        self.assertEqual(reviews_data[0]["pr_title"], "Add new landing page")
        self.assertEqual(reviews_data[0]["pr_author"], "jane_developer")

if __name__ == "__main__":
    unittest.main()

