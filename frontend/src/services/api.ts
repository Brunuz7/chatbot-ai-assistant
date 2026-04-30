import axios from 'axios';

function normalizeApiBaseUrl(url?: string) {
  const trimmed = (url || 'http://localhost:3001').replace(/\/+$/, '');
  return trimmed.replace(/\/api$/, '');
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/api/auth/refresh')
      .then((response) => {
        const newToken = response.data?.accessToken;
        if (!newToken) return null;
        localStorage.setItem('token', newToken);
        return newToken;
      })
      .catch(() => {
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Attempt transparent token refresh on 401.
// Do not force logout automatically; explicit logout is user-driven.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url = originalRequest.url || '';
    const isAuthRequest =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/logout');

    if (status === 401 && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();

      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

