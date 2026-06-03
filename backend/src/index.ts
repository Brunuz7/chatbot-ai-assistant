import './lib/loadRootEnv.js';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import contactRoutes from './routes/contactRouter.js';
import settingsRoutes from './routes/settingsRoutes.js';
import evolutionRoutes from './routes/evolutionRouter.js';
import systemLogRoutes from "./routes/systemLogRoutes.js";
import conversationStateRoutes from "./routes/conversationStateRoutes.js";
import autoResumeRoutes from './routes/autoResumeRoutes.js';
import dashboardRoutes from "./routes/dashboardRoutes.js";

import { prisma } from './lib/prisma.js';
import { AutoResumeService } from "./services/autoResumeService.js";
import { WebhookService } from './services/WebhookService.js';
import { ConversationService } from './services/ConversationService.js';
import { BulkMessageService } from './services/BulkMessageService.js';

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
  if (list.length === 1) return list[0];
  return list;
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

const rateLimitWindowMs = 15 * 60 * 1000;

/** Protecção contra brute-force em login/registo (sem limite global na API). */
const authSensitiveLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authSensitiveLimiter);
app.use('/api/auth/register', authSensitiveLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api', appRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use("/api/logs", systemLogRoutes);
app.use("/api/conversation-state", conversationStateRoutes);
app.use("/api/auto-resume", autoResumeRoutes);
app.use("/api/dashboard", dashboardRoutes);

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

/*
==========================================
AUTO RESUME (Interval)
==========================================
*/
setInterval(async () => {
  try {
    await AutoResumeService.execute();
  } catch (error) {
    console.error("Erro no AutoResume:", error);
  }
}, 30000);

/*
==========================================
BACKGROUND WORKERS (Fila/Processamento)
==========================================
*/
WebhookService.configureInboundWorker((job) => WebhookService.processInboundJobRow(job));
WebhookService.startInboundWorker();
ConversationService.startRetentionWorker();
BulkMessageService.startDispatchWorker();

app.listen(port, () => {
  console.log(`API em http://localhost:${port}`);
});