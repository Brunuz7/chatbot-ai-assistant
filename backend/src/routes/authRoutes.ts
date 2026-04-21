import express from 'express';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken as verifyRefreshTokenToken, verifyRefreshToken } from '../auth.js';
import { createUser, findUserByEmail, findUserById, saveRefreshToken, removeRefreshToken, verifyRefreshToken as storeVerifyRefresh, increaseFailedAttempts, resetFailedAttempts } from '../authStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const refreshCookieName = 'jid';

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'invalid_input' });
  const existing = findUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'user_exists' });
  const hashed = await hashPassword(password);
  const user = createUser(email, hashed);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  saveRefreshToken(user.id, refreshToken);
  res.cookie(refreshCookieName, refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ accessToken });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'invalid_input' });
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    return res.status(423).json({ error: 'account_locked' });
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    increaseFailedAttempts(user.id);
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  resetFailedAttempts(user.id);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  saveRefreshToken(user.id, refreshToken);
  res.cookie(refreshCookieName, refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ accessToken });
});

router.post('/refresh', (req, res) => {
  const token = req.cookies?.[refreshCookieName];
  if (!token) return res.status(401).json({ error: 'no_refresh_token' });
  const payload = verifyRefreshToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid_refresh' });
  const userId = payload.sub;
  if (!storeVerifyRefresh(userId, token)) return res.status(401).json({ error: 'invalid_refresh_store' });
  const user = findUserById(userId);
  if (!user) return res.status(401).json({ error: 'unknown_user' });
  // rotate refresh token
  removeRefreshToken(userId, token);
  const newRefresh = generateRefreshToken(user);
  saveRefreshToken(userId, newRefresh);
  const accessToken = generateAccessToken(user);
  res.cookie(refreshCookieName, newRefresh, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ accessToken });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.[refreshCookieName];
  if (token) {
    const payload = verifyRefreshToken(token);
    if (payload) {
      removeRefreshToken(payload.sub, token);
    }
  }
  res.clearCookie(refreshCookieName);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  // @ts-ignore
  res.json({ id: req.user?.sub, email: req.user?.email });
});

router.get('/protected', requireAuth, (_req, res) => {
  res.json({ ok: true, secret: 'dados do painel protegido' });
});

export default router;
