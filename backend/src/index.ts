import './lib/loadRootEnv.js';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import contactRoutes from './routes/contactRouter.js';

import { prisma } from './lib/prisma.js';
import { EvolutionService } from './services/EvolutionService.js';
import { WebhookQueueWorker } from './services/WebhookQueueWorker.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

/** Origens permitidas (SPA). Várias URLs separadas por vírgula. */
function corsOrigins(): string | string[] {
  const raw = (process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw.length === 0) return 'http://localhost:5173';
  if (raw.length === 1) return raw[0];
  return raw;
}

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
}

// CORS PRIMEIRO
app.use(
  cors({
    origin: corsOrigins(),
    credentials: true,
  }),
);
// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

app.use(limiter);


// Rotas
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', appRoutes);


// Health checks
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.send('API rodando 🚀');
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: String(error)
    });
  }
});


// Evolution API check
const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

if (!EVO_URL || !EVO_KEY) {
  console.warn(
    '⚠️ WARNING: EVOLUTION_API_URL or EVOLUTION_API_KEY is not defined in .env'
  );
} else {
  console.log('✅ Evolution API configuration loaded');
}


WebhookQueueWorker.configure(async (job) => {
  await EvolutionService.processInboundJobRow(job);
});
WebhookQueueWorker.start();

app.listen(port, () => {
  console.log(`API em http://localhost:${port}`);
});