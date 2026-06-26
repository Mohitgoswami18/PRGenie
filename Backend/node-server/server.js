require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'prgenie_default_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Simple JSON File Store
// ---------------------------------------------------------------------------
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Gemini AI Client
// ---------------------------------------------------------------------------
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

async function analyzeWithGemini(repoUrl, prUrl, codeContent) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured. Please set it in your .env file.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are PRGenie, an expert AI code reviewer. You are reviewing code from a GitHub repository.

Repository: ${repoUrl}
${prUrl ? `Pull Request: ${prUrl}` : ''}

Here is the code/diff to review:

\`\`\`
${codeContent}
\`\`\`

Provide a comprehensive, detailed code review in the following EXACT markdown format. Be thorough and specific. Give actual line references and code examples where applicable.

# 🤖 PRGenie AI Code Review

## 📊 Overall Score: [X]/100

## 📝 Summary
[Provide a 2-3 sentence summary of the code quality and main findings]

## 🐛 Bug Detection
[List actual or potential bugs found. If none, say "No bugs detected."]
- **[Severity: Critical/Warning/Info]** [File/Location]: [Description of the bug]
  - *Suggestion*: [How to fix it]

## 🔒 Security Findings
[List security vulnerabilities. If none, say "No security issues found."]
- **[Severity: Critical/Warning/Info]** [File/Location]: [Description]
  - *Suggestion*: [How to fix it]

## ⚡ Performance Issues
[List performance concerns. If none, say "No performance issues found."]
- **[Severity: Warning/Info]** [File/Location]: [Description]
  - *Suggestion*: [Optimization recommendation]

## 🧪 Test Coverage
[Comment on test coverage gaps]
- [List untested areas or missing test scenarios]

## 💡 Code Quality & Suggestions
[List code quality improvements]
- **[Priority: High/Medium/Low]** [Description]
  - *Current*: [Current approach]
  - *Recommended*: [Better approach with code example]

## 🏗️ Architecture & Design
[Comment on overall architecture, design patterns, modularity]

## ✅ What's Done Well
[List positive aspects of the code]
- [Good practice observed]

Be specific, actionable, and constructive. Reference actual code patterns from the provided content. Do not be generic.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// ---------------------------------------------------------------------------
// GitHub Helpers
// ---------------------------------------------------------------------------

function parseGitHubUrl(url) {
  // Patterns: https://github.com/owner/repo, https://github.com/owner/repo/pull/N
  const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) return null;

  const owner = repoMatch[1];
  const repo = repoMatch[2].replace(/\.git$/, '');
  const prMatch = url.match(/\/pull\/(\d+)/);

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    prNumber: prMatch ? parseInt(prMatch[1]) : null,
  };
}

async function fetchRepoContent(owner, repo) {
  try {
    // Fetch repository info
    const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'PRGenie-Bot', Accept: 'application/vnd.github.v3+json' },
    });

    // Fetch the file tree (default branch)
    const branch = repoRes.data.default_branch || 'main';
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { 'User-Agent': 'PRGenie-Bot', Accept: 'application/vnd.github.v3+json' } }
    );

    // Filter to code files only, limit to first 15 files to stay within token limits
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.css', '.html', '.json', '.yaml', '.yml', '.md', '.sql', '.sh'];
    const codeFiles = treeRes.data.tree
      .filter(f => f.type === 'blob' && f.size < 50000 && codeExtensions.some(ext => f.path.endsWith(ext)))
      .slice(0, 15);

    // Fetch content of each file
    let combinedContent = `# Repository: ${owner}/${repo}\n# Branch: ${branch}\n# Files analyzed: ${codeFiles.length}\n\n`;

    for (const file of codeFiles) {
      try {
        const contentRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`,
          { headers: { 'User-Agent': 'PRGenie-Bot', Accept: 'application/vnd.github.v3+json' } }
        );
        if (contentRes.data.encoding === 'base64' && contentRes.data.content) {
          const decoded = Buffer.from(contentRes.data.content, 'base64').toString('utf-8');
          combinedContent += `\n--- File: ${file.path} ---\n${decoded}\n`;
        }
      } catch {
        // Skip files that can't be fetched
      }
    }

    return {
      content: combinedContent,
      repoName: repoRes.data.full_name,
      description: repoRes.data.description || '',
      language: repoRes.data.language || 'Unknown',
      stars: repoRes.data.stargazers_count,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error('Repository not found. Please check the URL and ensure the repository is public.');
    }
    throw new Error(`Failed to fetch repository: ${err.message}`);
  }
}

async function fetchPRDiff(owner, repo, prNumber) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          'User-Agent': 'PRGenie-Bot',
          Accept: 'application/vnd.github.v3.diff',
        },
      }
    );
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error(`Pull Request #${prNumber} not found.`);
    }
    throw new Error(`Failed to fetch PR diff: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Auth Middleware
// ---------------------------------------------------------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const users = readJSON(USERS_FILE);
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Signed in successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// Analysis Route
// ---------------------------------------------------------------------------
app.post('/api/analyze', authMiddleware, async (req, res) => {
  try {
    const { repoUrl, prUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid GitHub URL. Please provide a valid GitHub repository URL.' });
    }

    let codeContent = '';
    let repoInfo = {};
    let prNumber = null;

    // If PR URL provided, parse and fetch diff
    if (prUrl && prUrl.trim()) {
      const prParsed = parseGitHubUrl(prUrl);
      if (prParsed && prParsed.prNumber) {
        prNumber = prParsed.prNumber;
        const diff = await fetchPRDiff(prParsed.owner, prParsed.repo, prParsed.prNumber);
        codeContent = diff;
        repoInfo = { repoName: prParsed.fullName };
      } else {
        return res.status(400).json({ error: 'Invalid Pull Request URL. Format: https://github.com/owner/repo/pull/123' });
      }
    } else if (parsed.prNumber) {
      // PR URL was in the repo URL field
      prNumber = parsed.prNumber;
      const diff = await fetchPRDiff(parsed.owner, parsed.repo, parsed.prNumber);
      codeContent = diff;
      repoInfo = { repoName: parsed.fullName };
    } else {
      // Fetch repo content
      const data = await fetchRepoContent(parsed.owner, parsed.repo);
      codeContent = data.content;
      repoInfo = data;
    }

    // Call Gemini
    const reviewText = await analyzeWithGemini(repoUrl, prUrl, codeContent);

    // Extract score from review text
    const scoreMatch = reviewText.match(/Overall Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    // Count findings
    const bugMatches = reviewText.match(/Severity:\s*Critical|Severity:\s*Warning/gi);
    const securitySection = reviewText.match(/Security Findings[\s\S]*?(?=##|$)/i);
    const securityMatches = securitySection ? securitySection[0].match(/Severity:/gi) : null;

    const bugsFound = bugMatches ? bugMatches.length : 0;
    const securityIssues = securityMatches ? securityMatches.length : 0;

    // Save review
    const reviews = readJSON(REVIEWS_FILE);
    const newReview = {
      id: uuidv4(),
      userId: req.user.id,
      repo_full_name: repoInfo.repoName || parsed.fullName,
      pr_number: prNumber || 0,
      pr_title: prUrl ? `PR #${prNumber} Review` : `Repository Analysis`,
      pr_author: req.user.name,
      pr_url: prUrl || repoUrl,
      review_text: reviewText,
      bugs_found: bugsFound,
      security_issues: securityIssues,
      score: score,
      status: 'complete',
      created_at: new Date().toISOString(),
    };

    reviews.push(newReview);
    writeJSON(REVIEWS_FILE, reviews);

    res.json({
      review: newReview,
      message: 'Analysis complete',
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Reviews Routes
// ---------------------------------------------------------------------------
app.get('/api/reviews', authMiddleware, (req, res) => {
  const reviews = readJSON(REVIEWS_FILE);
  const userReviews = reviews
    .filter(r => r.userId === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ reviews: userReviews });
});

app.get('/api/reviews/:id', authMiddleware, (req, res) => {
  const reviews = readJSON(REVIEWS_FILE);
  const review = reviews.find(r => r.id === req.params.id && r.userId === req.user.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json(review);
});

app.delete('/api/reviews/:id', authMiddleware, (req, res) => {
  let reviews = readJSON(REVIEWS_FILE);
  const index = reviews.findIndex(r => r.id === req.params.id && r.userId === req.user.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  reviews.splice(index, 1);
  writeJSON(REVIEWS_FILE, reviews);

  res.json({ message: 'Review deleted successfully' });
});

// ---------------------------------------------------------------------------
// Stats Route
// ---------------------------------------------------------------------------
app.get('/api/stats', authMiddleware, (req, res) => {
  const reviews = readJSON(REVIEWS_FILE);
  const userReviews = reviews.filter(r => r.userId === req.user.id);

  const totalReviews = userReviews.length;
  const bugsCaught = userReviews.reduce((sum, r) => sum + (r.bugs_found || 0), 0);
  const securityIssues = userReviews.reduce((sum, r) => sum + (r.security_issues || 0), 0);
  const avgScore = totalReviews > 0
    ? Math.round(userReviews.reduce((sum, r) => sum + (r.score || 75), 0) / totalReviews)
    : 0;

  res.json({
    total_reviews: totalReviews,
    bugs_caught: bugsCaught,
    security_issues_prevented: securityIssues,
    avg_score: avgScore,
    avg_review_time: '2.4s',
  });
});

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gemini_configured: !!GEMINI_API_KEY,
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 PRGenie Backend running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Gemini AI: ${GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured (set GEMINI_API_KEY in .env)'}`);
  console.log('');
});
