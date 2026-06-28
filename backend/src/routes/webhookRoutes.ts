import express, { type Express } from 'express';
import { WebhookController } from '../controllers/WebhookController.js';
import { parseMetaWebhookJson, verifyMetaWebhookSignature } from '../middleware/metaWebhook.js';

export function registerWebhookRoutes(app: Express): void {
  app.get('/webhook/whatsapp-official', WebhookController.verifyOfficial);
  app.post(
    '/webhook/whatsapp-official',
    express.raw({ type: 'application/json' }),
    verifyMetaWebhookSignature,
    parseMetaWebhookJson,
    WebhookController.handleOfficial,
  );
}
