import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from './authStore.js';


const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret';

export async function hashPassword(password: string) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: User) {
  return jwt.sign({ sub: user.id, email: user.email }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(user: User) {
  // use uuid as opaque token, signed with secret
  const tokenId = uuidv4();
  const token = jwt.sign({ jti: tokenId, sub: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return token;
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as { sub: string; email: string; iat: number; exp: number };
  } catch (e) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as { sub: string; jti: string; iat: number; exp: number };
  } catch (e) {
    return null;
  }
}
