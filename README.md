# PRGenie 🤖

**An AI-powered GitHub bot that reviews Pull Requests the moment they're opened.**

AutoReview listens for PR events via GitHub webhooks, sends the diff to Anthropic's Claude API, and posts a structured four-pillar code review as a comment — in under 60 seconds. No configuration per PR. No waiting for a human reviewer.

---

## What it does

When a developer opens or updates a Pull Request, AutoReview automatically analyzes:

- 🐛 **Bugs & Logic Errors** — off-by-one errors, null references, incorrect conditionals, broken control flow
- 🔒 **Security Vulnerabilities** — SQL injection, exposed secrets, auth bypass, insecure defaults
- 🧪 **Missing Test Coverage** — functions and edge cases with no corresponding tests
- 💡 **Improvement Suggestions** — concrete refactoring ideas with example code where helpful

Every finding includes a specific line number. No generic feedback.

---

## Demo

> Open a PR → AutoReview comments in ~30 seconds

```
PR #42 opened: "Fix user authentication bug"

AutoReview commented:

## 🐛 Bugs & Logic Errors
- Line 47 (auth.py): Password comparison uses == instead of a
  constant-time function. Vulnerable to timing attacks.
- Line 83 (auth.py): user object not checked for None before
  accessing user.id — will raise AttributeError on failed logins.

## 🔒 Security Vulnerabilities
- Line 52 (db.py): Raw string interpolation in SQL query.
  Use parameterized queries: cursor.execute("SELECT * FROM users
  WHERE id = ?", (user_id,))

## 🧪 Missing Test Coverage
- login() function has no test for the case where the user
  does not exist in the database.
- Token expiry logic is untested.

## 💡 Improvement Suggestions
- Line 61: Extract token generation into a separate utility
  function for reuse and testability.
- Consider using a library like python-jose for JWT handling
  instead of manual encoding.
```

---

## Architecture

```
Developer opens PR
       │
       ▼
GitHub Webhook ──► FastAPI Server ──► Anthropic Claude API
                        │                      │
                        │         Structured review response
                        │                      │
                        ◄──────────────────────┘
                        │
                        ▼
              GitHub PR Comment Posted
                        │
                        ▼
                  SQLite Database
                  (review history)
                        │
                        ▼
                React Dashboard
              (review history UI)
```

**Stack:**
- **Backend:** Python 3.11 + FastAPI
- **AI:** Anthropic Claude API (`claude-3-5-sonnet`)
- **GitHub:** Webhooks + REST API via PyGithub
- **Database:** SQLite + SQLAlchemy
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Hosting:** Render (backend) + Vercel (frontend)

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A GitHub account and a repository to test with
- An [Anthropic API key](https://console.anthropic.com/)

## Deployment

### Backend (Render)
### Frontend (Vercel)

---


## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Open a Pull Request — AutoReview will review it automatically 🤖

---
TEAM - Code Gaudrians (Dev Gathering 2k26)
Mohit Goswami 
Muskan Arora
Khushi Arora
Manish Pal