import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth.js';
import type { AuthRequest } from '../types/index.js';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    let token: string | null = null;

    // 1. tenta pegar Bearer token
    if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];

    // 2. fallback para cookie access_token
    if (!token && req.cookies?.accessToken) token = req.cookies.accessToken;

    console.log('Authorization Header:', authHeader || 'não enviado');
    console.log('Access Cookie:', req.cookies?.accessToken || 'não enviado');

    if (!token) {
      return res.status(401).json({
        error: 'missing_token',
        message: 'Token não encontrado',
      });
    }
    console.log('Token:', token);

    const payload = verifyAccessToken(token);

    console.log('Payload:', payload);

    if (!payload) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Token inválido ou expirado',
      });
    }

    req.user = {
      sub: String(payload.sub),
      email: String(payload.email ?? ''),
    };

    next();
  } catch (error) {
    console.error('Erro no middleware auth:', error);

    return res.status(401).json({
      error: 'auth_failed',
    });
  }
}
// export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
//   const auth = req.headers.authorization;
//   console.log(`Auth Middleware - Header: ${auth ? 'Present' : 'MISSING'}`);
//   if (!auth || !auth.startsWith('Bearer ')) {
//     console.warn(`Auth Middleware - Falha: ${!auth ? 'Header ausente' : 'Formato inválido (deve ser Bearer)'}`);
//     return res.status(401).json({ error: 'missing_token' });
//   }
//   const token = auth.split(' ')[1];
//   const payload = verifyAccessToken(token);
//   if (!payload) return res.status(401).json({ error: 'invalid_token' });
//   req.user = { sub: payload.sub, email: payload.email };
//   next();
// }
