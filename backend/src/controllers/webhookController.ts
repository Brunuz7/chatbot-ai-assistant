import { Request, Response } from 'express';
import { WebhookService } from '../services/WebhookService.js';

export class WebhookController {
  /** Meta Cloud API — verificação (GET). */
  static verifyOfficial(req: Request, res: Response) {
    const result = WebhookService.verifyOfficialSubscription(req.query as Record<string, unknown>);

    if (result.ok === false) {
      const reason = result.reason;
      if (reason === 'missing_hub_params') {
        return res.status(200).type('text/plain').send(
          'Webhook WhatsApp Oficial activo. Configure no painel Meta com GET hub.mode=subscribe, hub.verify_token e hub.challenge.',
        );
      }
      console.warn('Webhook oficial: verificação recusada.', reason);
      return res.status(403).type('text/plain').send(`Forbidden: ${reason}`);
    }

    return res.status(200).send(result.challenge);
  }

  /** Meta Cloud API — eventos (POST). */
  static async handleOfficial(req: Request, res: Response) {
    try {
      const result = await WebhookService.handleOfficial((req.body ?? {}) as Record<string, unknown>);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro no webhook oficial:', error);
      return res.status(200).json({ status: 'error' });
    }
  }

  /** Evolution API — eventos (POST). */
  static async handleEvolution(req: Request, res: Response) {
    try {
      const result = await WebhookService.handleEvolution((req.body ?? {}) as Record<string, unknown>);
      const statusCode = result.status === 'queued' ? 202 : 200;
      return res.status(statusCode).json(result);
    } catch (error) {
      console.error('Erro no webhook Evolution:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}
