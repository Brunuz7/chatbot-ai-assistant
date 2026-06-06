import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { hashPassword } from '../auth.js';
import { findUserByEmail } from '../authStore.js';
import { REFRESH_TOKEN_MAX_AGE_MS } from '../config/session.js';
import type { AuthRequest } from '../types/index.js';

const refreshCookieName = 'jid';

/** Secure só em HTTPS (ou COOKIE_SECURE=1). NODE_ENV=production em HTTP local quebrava o login. */
function cookieSecure(req: Request): boolean {
  if (process.env.COOKIE_SECURE === '0') return false;
  if (process.env.COOKIE_SECURE === '1') return true;
  return req.secure || req.get('x-forwarded-proto') === 'https';
}

function refreshCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

function clearRefreshCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    path: '/',
  };
}

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password, name, company_name, company_segment, phone_number } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'invalid_input' });

    try {
      const existing = await findUserByEmail(email);
      if (existing) return res.status(409).json({ error: 'user_exists' });

      const hashed = await hashPassword(password);
      const { accessToken, refreshToken } = await AuthService.register(email, hashed, {
        name,
        company_name,
        company_segment,
        phone_number,
      });

      res.cookie(refreshCookieName, refreshToken, refreshCookieOptions(req));
      res.json({ accessToken });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body || {};
    try {
      const { accessToken, refreshToken } = await AuthService.login(email, password);

      res.cookie(refreshCookieName, refreshToken, refreshCookieOptions(req));
      res.json({ accessToken });
    } catch (error: any) {
      console.log('Login error:', error);
      if (error.message === 'invalid_input') return res.status(400).json({ error: 'invalid_input' });
      if (error.message === 'invalid_credentials') return res.status(401).json({ error: 'invalid_credentials' });
      if (error.message === 'account_locked') return res.status(423).json({ error: 'account_locked' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies?.[refreshCookieName];
    if (!token) return res.status(401).json({ error: 'no_refresh_token' });

    try {
      const { accessToken, refreshToken } = await AuthService.refresh(token);

      res.cookie(refreshCookieName, refreshToken, refreshCookieOptions(req));
      res.json({ accessToken });
    } catch (error: any) {
      if (error.message === 'invalid_refresh') return res.status(401).json({ error: 'invalid_refresh' });
      if (error.message === 'invalid_refresh_store') return res.status(401).json({ error: 'invalid_refresh_store' });
      if (error.message === 'unknown_user') return res.status(401).json({ error: 'unknown_user' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    const token = req.cookies?.[refreshCookieName];
    try {
      await AuthService.logout(token);
      res.clearCookie(refreshCookieName, clearRefreshCookieOptions(req));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    try {
      const profile = await AuthService.getUserProfile(req.user!.sub);
      res.json(profile);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateMe(req: AuthRequest, res: Response) {
    try {
      const profile = await AuthService.updateUserProfile(req.user!.sub, req.body ?? {});
      res.json(profile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'invalid_input') return res.status(400).json({ error: 'invalid_input' });
      if (message === 'invalid_phone') return res.status(400).json({ error: 'invalid_phone' });
      if (message === 'invalid_password') return res.status(400).json({ error: 'invalid_password' });
      if (message === 'user_exists') return res.status(409).json({ error: 'user_exists' });
      if (message === 'User not found') return res.status(404).json({ error: 'user_not_found' });
      console.error('Auth updateMe:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static protected(req: Request, res: Response) {
    res.json({ ok: true, secret: 'dados do painel protegido' });
  }
}
