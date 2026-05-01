import type { Request } from 'express';

export interface AuthRequest extends Request {
  user?: { sub: string; email: string };
}

export type AccessTokenPayload = { sub: string; email: string; iat: number; exp: number };

export type RefreshTokenPayload = { sub: string; jti: string; iat: number; exp: number };
