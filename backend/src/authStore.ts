import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: number | null;
  refreshTokens: string[];
}

const users: Record<string, User> = {};

export function createUser(email: string, passwordHash: string) {
  const id = randomUUID();
  const user: User = { id, email, passwordHash, failedAttempts: 0, lockedUntil: null, refreshTokens: [] };
  users[id] = user;
  return user;
}

export function findUserByEmail(email: string) {
  return Object.values(users).find((u) => u.email === email) || null;
}

export function findUserById(id: string) {
  return users[id] || null;
}

export function saveRefreshToken(userId: string, token: string) {
  const u = users[userId];
  if (!u) return false;
  u.refreshTokens.push(token);
  return true;
}

export function removeRefreshToken(userId: string, token: string) {
  const u = users[userId];
  if (!u) return false;
  u.refreshTokens = u.refreshTokens.filter((t) => t !== token);
  return true;
}

export function verifyRefreshToken(userId: string, token: string) {
  const u = users[userId];
  if (!u) return false;
  return u.refreshTokens.includes(token);
}

export function increaseFailedAttempts(userId: string) {
  const u = users[userId];
  if (!u) return;
  u.failedAttempts += 1;
  if (u.failedAttempts >= 5) {
    // lock for 15 minutes
    u.lockedUntil = Date.now() + 15 * 60 * 1000;
  }
}

export function resetFailedAttempts(userId: string) {
  const u = users[userId];
  if (!u) return;
  u.failedAttempts = 0;
  u.lockedUntil = null;
}
