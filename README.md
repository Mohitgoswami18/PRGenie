# PRGenie 🤖

**PRGenie** is an AI-powered code review assistant that automatically analyzes GitHub Pull Requests the moment they are opened. 

It provides developers with direct, inline feedback, and stores reviews in a central SQLite database. A sleek React-based dashboard lets you view full review histories, delete old reviews, and submit custom PR URLs for analysis under different review modes.

---

## Key Features

- 🐛 **Bugs & Logic Errors** — Off-by-one errors, null pointers, control flow flaws.
- 🔒 **Security Vulnerabilities** — SQL injection, hardcoded secrets, insecure APIs.
- 🧪 **Missing Test Coverage** — Code branches or edge cases that lack unit testing.
- 💡 **Improvement Suggestions** — Performance refactorings and code style recommendations.
- ⚙️ **Review Modes** — Choose between **Balanced** (practical), **Strict** (flags all issues), or **Detailed** (educational with "why" explanations).
- 📊 **Central Dashboard** — Browse past PR review histories, see statistics, and analyze custom PR URLs.

---

## Architecture & Integration

```
       [Developer Opens GitHub PR]
                   │
                   ▼ (Optional Webhook)
           [POST /webhook]
                   │
  ┌────────────────┼────────────────┐
  │         FastAPI Server          │ ◄─── [Submit URL on Dashboard]
  └────────────────┬────────────────┘
                   │
                   ▼
         [Google Gemini Flash API] (Performs review)
                   │
                   ├──────────► [Post PR Comment on GitHub] (PAT Required)
                   │
                   ▼
           [SQLite Database] (Stores reviews)
                   ▲
                   │
           [React Dashboard] (Reads & deletes reviews / stats / polls live)
```

- **Backend:** Python 3.12 + FastAPI + SQLite + SQLAlchemy
- **AI Engine:** Google Gemini Flash API (`google-genai` client)
- **Frontend:** React 18 + Vite + Tailwind CSS + Framer Motion + Lucide React

---

## Setup & Running Locally

### 1. Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** installed
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

---

### 2. Configure Environment Variables

#### Backend Configuration
Create or edit `Backend/.env`:
```ini
# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Personal Access Token (Required only for posting comments or private repos)
GITHUB_PAT=your_github_pat_here

# GitHub Webhook Secret (Leave as placeholder to skip signature checks locally)
WEBHOOK_SECRET=your_webhook_secret_here

# Database URL
DATABASE_URL=sqlite:///./prgenie.db
```

#### Frontend Configuration
Create or edit `Frontend/.env`:
```ini
# API URL pointing to the local FastAPI backend
VITE_API_URL=http://localhost:8000/api
```

---

### 3. Run with one click

If you are on Windows, you can launch both services and automatically install missing dependencies by executing our PowerShell script:

```powershell
./start.ps1
```

This launches the **FastAPI Backend** and the **Vite Frontend Dev Server** in separate, clean terminal windows so you can easily view their real-time log outputs!

---

### 4. Running Manually

If you prefer starting the components individually:

#### Start Backend:
```bash
cd Backend
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Start Frontend:
```bash
cd Frontend
npm install
npm run dev
```

---
## Authors & Project Team
**TEAM: Code Guardians** (Dev Gathering 2k26)
- Mohit Goswami
- Muskan Arora
- Khushi Arora
- Manish Pal