import './loadEnv.js';
import { isEvolutionConfigured } from './config/evolution.js';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import { WebhookController } from './controllers/WebhookController.js';
import { parseMetaWebhookJson, verifyMetaWebhookSignature } from './middleware/metaWebhook.js';

import { prisma } from './prisma.js';
import { InboundMessageWorker } from './services/InboundMessageWorker.js';
import { ConversationRetention } from './services/ConversationRetention.js';
import { BulkMessageDispatch } from './services/BulkMessageDispatch.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

/** Origens permitidas (SPA). Várias URLs separadas por vírgula. */
function corsOrigins(): string | string[] {
  const raw = (process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const base = raw.length > 0 ? raw : ['http://localhost:5173'];

  // localhost e 127.0.0.1 são origens diferentes para o browser: incluir o par evita CORS com credentials.
  const expanded = new Set<string>();
  for (const o of base) {
    expanded.add(o);
    try {
      const u = new URL(o);
      if (u.hostname === 'localhost') {
        const alt = new URL(u.href);
        alt.hostname = '127.0.0.1';
        expanded.add(alt.origin);
      } else if (u.hostname === '127.0.0.1') {
        const alt = new URL(u.href);
        alt.hostname = 'localhost';
        expanded.add(alt.origin);
      }
    } catch {
      /* URL inválida no env — ignorar expansão */
    }
  }

  const list = [...expanded];
  return list.length === 1 ? list[0] : list;
}

function warnMisconfiguredCors(): void {
  const apiPort = String(port);
  const origins = corsOrigins();
  const list = Array.isArray(origins) ? origins : [origins];
  const bad = list.filter((o) => {
    try {
      const u = new URL(o);
      return u.port === apiPort;
    } catch {
      return false;
    }
  });
  if (bad.length > 0) {
    console.warn(
      `⚠️ FRONTEND_ORIGIN aponta para a porta da API (${apiPort}): ${bad.join(', ')}. ` +
        'Use a URL do Vite (ex.: http://localhost:5173) ou o browser bloqueia pedidos e nada grava.',
    );
  }
  console.log('CORS origens permitidas:', list.join(', '));
}

if (process.env.TRUST_PROXY === '1') app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

// Meta WhatsApp Oficial — corpo raw para validar X-Hub-Signature-256 (antes do express.json global)
app.get('/webhook/whatsapp-official', WebhookController.verifyOfficial);
app.post(
  '/webhook/whatsapp-official',
  express.raw({ type: 'application/json' }),
  verifyMetaWebhookSignature,
  parseMetaWebhookJson,
  WebhookController.handleOfficial,
);

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

const rateLimitWindowMs = 15 * 60 * 1000;

/** Protecção contra brute-force em login/registo (sem limite global na API). */
const authSensitiveLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth/login', authSensitiveLimiter);
app.use('/auth/register', authSensitiveLimiter);
app.use('/api/auth/login', authSensitiveLimiter);
app.use('/api/auth/register', authSensitiveLimiter);

// Rotas (API em subdomínio dedicado). /api/* mantém compatibilidade com deploys anteriores.
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use(appRoutes);
app.use('/api', appRoutes);

// Health checks
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

if (!isEvolutionConfigured()) {
  console.warn('⚠️ WARNING: EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente no .env');
} else {
  console.log('✅ Evolution API configuration loaded');
}

InboundMessageWorker.start();
ConversationRetention.start();
BulkMessageDispatch.start();

warnMisconfiguredCors();

app.listen(port, () => {
  console.log(`API em http://localhost:${port}`);
});
