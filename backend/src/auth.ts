import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@prisma/client';
import type { AccessTokenPayload, RefreshTokenPayload } from './types/authTypes.js';


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

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  } catch (e) {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
  } catch (e) {
    return null;
  }
}
