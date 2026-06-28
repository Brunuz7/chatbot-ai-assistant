import type { Express } from 'express';
import { prisma } from '../prisma.js';

export function registerHealthRoutes(app: Express): void {
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/', (_req, res) => {
    res.send('API rodando 🚀');
  });

  app.get('/health/db', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'connected' });
    } catch (error) {
      res.status(500).json({
        status: 'disconnected',
        error: String(error),
      });
    }
  });
}
