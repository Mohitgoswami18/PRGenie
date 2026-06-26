import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prgenie_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signup = async (name, email, password) => {
  const response = await api.post('/auth/signup', { name, email, password });
  return response.data;
};

export const signin = async (email, password) => {
  const response = await api.post('/auth/signin', { email, password });
  return response.data;
};

export const getMe = async (token) => {
  const response = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const getReviews = async () => {
  const response = await api.get('/reviews');
  return response.data;
};

export const getReviewById = async (id) => {
  const response = await api.get(`/reviews/${id}`);
  return response.data;
};

export const deleteReview = async (id) => {
  const response = await api.delete(`/reviews/${id}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
export const analyzeRepo = async (repoUrl, prUrl) => {
  const response = await api.post('/analyze', { repoUrl, prUrl });
  return response.data;
};
