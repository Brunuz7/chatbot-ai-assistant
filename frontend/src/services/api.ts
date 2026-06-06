import axios, { AxiosError, InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { isAccessTokenValid, shouldRefreshAccessToken } from '../utils/authToken';

function normalizeApiBaseUrl(url?: string): string {
  return (url || 'http://localhost:3001').replace(/\/+$/, '').replace(/(\/api)+$/, '');
}

/**
 * Em dev, alinha o host da API ao do frontend (localhost ↔ 127.0.0.1).
 * Caso contrário o cookie de refresh não é enviado e a sessão cai sozinha.
 */
function resolveApiBaseURL(): string {
  let url = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

  if (typeof window !== 'undefined') {
    const pageHost = window.location.hostname;
    try {
      const api = new URL(url);
      if (pageHost === 'localhost' && api.hostname === '127.0.0.1') {
        api.hostname = 'localhost';
        url = api.origin;
      } else if (pageHost === '127.0.0.1' && api.hostname === 'localhost') {
        api.hostname = '127.0.0.1';
        url = api.origin;
      }
    } catch {
      /* mantém URL configurada */
    }
  }

  return url;
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  withCredentials: true,
});

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

import { clearAuthProfileCache } from './authProfileCache';

export function clearSession() {
  localStorage.removeItem('token');
  clearAuthProfileCache();
}

function redirectToLogin() {
  if (window.location.pathname.startsWith('/entrar') || window.location.pathname.startsWith('/cadastro')) {
    return;
  }
  window.location.href = '/entrar';
}

let refreshPromise: Promise<string | null> | null = null;

type RefreshOptions = { clearSessionOnFailure?: boolean };

export async function refreshAccessToken(options: RefreshOptions = {}): Promise<string | null> {
  const { clearSessionOnFailure = false } = options;
  const stored = localStorage.getItem('token');

  if (stored && !shouldRefreshAccessToken(stored) && isAccessTokenValid(stored)) {
    return stored;
  }

  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((response) => {
        const newToken = response.data?.accessToken;

        if (!newToken) {
          if (clearSessionOnFailure || !isAccessTokenValid(stored)) clearSession();
          return null;
        }

        localStorage.setItem('token', newToken);
        return newToken;
      })
      .catch(() => {
        if (clearSessionOnFailure || !isAccessTokenValid(stored)) clearSession();
        return isAccessTokenValid(stored) ? stored : null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || ({} as AxiosRequestHeaders);
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (status === 401 && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken({ clearSessionOnFailure: true });

      if (newToken) {
        originalRequest.headers = originalRequest.headers || ({} as AxiosRequestHeaders);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      if (!isAccessTokenValid(localStorage.getItem('token'))) {
        clearSession();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
