import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import contactRoutes from './routes/contactRouter.js';

import { prisma } from './lib/prisma.js';

const app = express();
const port = Number(process.env.PORT) || 3001;


// CORS PRIMEIRO
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
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


app.listen(port, () => {
  console.log(`API em http://localhost:${port}`);
});