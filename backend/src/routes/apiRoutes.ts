import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './authRoutes.js';
import appRoutes from './appRoutes.js';

const rateLimitWindowMs = 15 * 60 * 1000;

const authSensitiveLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerApiRoutes(app: Express): void {
  app.use('/auth/login', authSensitiveLimiter);
  app.use('/auth/register', authSensitiveLimiter);
  app.use('/api/auth/login', authSensitiveLimiter);
  app.use('/api/auth/register', authSensitiveLimiter);

  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use(appRoutes);
  app.use('/api', appRoutes);
}
