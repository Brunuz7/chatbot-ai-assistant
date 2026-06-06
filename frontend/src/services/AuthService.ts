import api from './api';
import {
  clearAuthProfileCache,
  getAuthProfileInflight,
  getCachedAuthProfile,
  setAuthProfileCache,
  setAuthProfileInflight,
} from './authProfileCache';
import type { AuthProfile, AuthTokens, RegisterPayload, UpdateProfilePayload } from '../types/auth';

export { clearAuthProfileCache } from './authProfileCache';

export class AuthService {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>(
      '/auth/login',
      { email, password },
      { withCredentials: true },
    );
    return data;
  }

  async register(payload: RegisterPayload): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/register', payload);
    return data;
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  }

  async getProfile(force = false): Promise<AuthProfile> {
    const cached = getCachedAuthProfile();
    if (!force && cached) return cached;

    const inflight = getAuthProfileInflight();
    if (!force && inflight) return inflight;

    const request = api
      .get<AuthProfile>('/auth/me')
      .then(({ data }) => {
        setAuthProfileCache(data);
        return data;
      })
      .finally(() => {
        setAuthProfileInflight(null);
      });

    setAuthProfileInflight(request);
    return request;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthProfile> {
    const { data } = await api.patch<AuthProfile>('/auth/me', payload);
    setAuthProfileCache(data);
    return data;
  }

  persistAccessToken(token: string): void {
    localStorage.setItem('token', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('token');
    clearAuthProfileCache();
  }
}

export const authService = new AuthService();
