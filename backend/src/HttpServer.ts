import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { isEvolutionConfigured } from './config/evolution.js';
import { corsOrigins, warnMisconfiguredCors } from './config/cors.js';
import { registerApiRoutes } from './routes/apiRoutes.js';
import { registerHealthRoutes } from './routes/healthRoutes.js';
import { registerWebhookRoutes } from './routes/webhookRoutes.js';

export class HttpServer {
  readonly app: Express;
  readonly port: number;

  constructor(port = Number(process.env.PORT) || 3001) {
    this.app = express();
    this.port = port;
  }

  configure(): this {
    this.configureTrustProxy();
    registerWebhookRoutes(this.app);
    this.configureMiddleware();
    registerApiRoutes(this.app);
    registerHealthRoutes(this.app);
    this.logStartupHints();
    return this;
  }

  listen(): void {
    this.app.listen(this.port, () => {
      console.log(`API em http://localhost:${this.port}`);
    });
  }

  private configureTrustProxy(): void {
    if (process.env.TRUST_PROXY === '1') {
      this.app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
    }
  }

  private configureMiddleware(): void {
    this.app.use(
      cors({
        origin: corsOrigins(),
        credentials: true,
      }),
    );
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(cookieParser());
  }

  private logStartupHints(): void {
    if (!isEvolutionConfigured()) {
      console.warn('⚠️ WARNING: EVOLUTION_API_URL ou EVOLUTION_API_KEY ausente no .env');
    } else {
      console.log('✅ Evolution API configuration loaded');
    }

    warnMisconfiguredCors(this.port);
  }
}
