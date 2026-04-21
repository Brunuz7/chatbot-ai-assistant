import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth.js';

export interface AuthRequest extends Request {
  user?: { sub: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' });
  const token = auth.split(' ')[1];
  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid_token' });
  req.user = { sub: payload.sub, email: (payload as any).email };
  next();
}
