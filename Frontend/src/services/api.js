import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      total_reviews: mockReviews.length,
      bugs_caught: mockReviews.reduce((sum, r) => sum + r.bugs_found, 0),
      security_issues_prevented: mockReviews.reduce((sum, r) => sum + r.security_issues, 0),
      avg_review_time: '< 1s',
    };
  }
};

export const analyzePr = async (prUrl, mode = 'balanced') => {
  try {
    const response = await api.post('/analyze', { pr_url: prUrl, mode });
    return response.data;
  } catch (error) {
    // Surface backend error message if available
    const detail = error?.response?.data?.detail;
    if (detail) {
      throw new Error(detail);
    }
    throw new Error(error.message || 'Failed to submit PR for analysis');
  }
};

export const deleteReview = async (id) => {
  try {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  } catch (error) {
    console.warn(`Failed to delete review ${id}`, error);
    throw error;
  }
};

/**
 * Poll a review by ID until its status is no longer "pending".
 * Calls `onUpdate(review)` each poll and resolves with the final review.
 *
 * @param {number} reviewId
 * @param {function} onUpdate - called on each successful poll
 * @param {number} intervalMs - poll interval (default 2s)
 * @param {number} maxAttempts - max polls before giving up (default 60 = 2min)
 * @returns {Promise<object>} the completed review object
 */
export const pollReviewStatus = (reviewId, onUpdate, intervalMs = 2000, maxAttempts = 60) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const review = await getReviewById(reviewId);
        if (onUpdate) onUpdate(review);

        if (review.status !== 'pending') {
          resolve(review);
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error('Review is taking too long. Please check the dashboard later.'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
};
