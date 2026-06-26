import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Mock data fallback
const mockReviews = [
  {
    id: 1,
    repo_full_name: 'Mohitgoswami18/PRGenie',
    pr_number: 42,
    pr_title: 'Fix authentication bug',
    pr_author: 'mohitgoswami',
    pr_url: 'https://github.com/Mohitgoswami18/PRGenie/pull/42',
    review_text: '## 🐛 Bugs & Logic Errors\n- Line 47: Password comparison uses `==` instead of a constant-time function.\n\n## 🔒 Security Vulnerabilities\n- Line 52: Raw string interpolation in SQL query.\n\n## 💡 Improvement Suggestions\n- Consider extracting token generation to a utility.',
    bugs_found: 2,
    security_issues: 1,
    status: 'complete',
    created_at: '2026-06-25T10:30:00Z',
  },
  {
    id: 2,
    repo_full_name: 'Mohitgoswami18/PRGenie',
    pr_number: 43,
    pr_title: 'Add dashboard UI',
    pr_author: 'muskan',
    pr_url: 'https://github.com/Mohitgoswami18/PRGenie/pull/43',
    review_text: '## 🧪 Missing Test Coverage\n- `Dashboard.jsx` has no corresponding unit tests.\n\n## 💡 Improvement Suggestions\n- Use lazy loading for the statistics chart.',
    bugs_found: 0,
    security_issues: 0,
    status: 'complete',
    created_at: '2026-06-25T12:15:00Z',
  },
];

export const getReviews = async () => {
  try {
    const response = await api.get('/reviews');
    return response.data;
  } catch (error) {
    console.warn('Backend unavailable, using mock data for reviews', error);
    return { reviews: mockReviews };
  }
};

export const getReviewById = async (id) => {
  try {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  } catch (error) {
    console.warn(`Backend unavailable, using mock data for review ${id}`, error);
    const review = mockReviews.find((r) => r.id === parseInt(id));
    if (review) return review;
    throw new Error('Review not found');
  }
};

export const getStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.warn('Backend unavailable, using mock data for stats', error);
    return {
      total_reviews: 142,
      bugs_caught: 312,
      security_issues_prevented: 45,
      avg_review_time: '0.4s',
    };
  }
};

export const analyzePr = async (prUrl) => {
  const response = await api.post('/analyze', { pr_url: prUrl });
  return response.data;
};

export const login = async (email, password) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  
  const response = await api.post('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user_email');
};
