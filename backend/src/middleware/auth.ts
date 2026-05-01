import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth.js';
import type { AuthRequest } from '../types/auth.types.js';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  console.log(`Auth Middleware - Header: ${auth ? 'Present' : 'MISSING'}`);
  if (!auth || !auth.startsWith('Bearer ')) {
    console.warn(`Auth Middleware - Falha: ${!auth ? 'Header ausente' : 'Formato inválido (deve ser Bearer)'}`);
    return res.status(401).json({ error: 'missing_token' });
  }
  const token = auth.split(' ')[1];
  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid_token' });
  req.user = { sub: payload.sub, email: payload.email };
  next();
}
