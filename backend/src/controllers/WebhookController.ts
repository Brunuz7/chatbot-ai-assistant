import { Request, Response } from 'express';
import { WebhookService } from '../services/WebhookService.js';

export class WebhookController {
  /** Meta — verificação GET (hub.mode=subscribe). Ver https://developers.facebook.com/docs/graph-api/webhooks/getting-started */
  static verifyOfficial(req: Request, res: Response) {
    const result = WebhookService.verifyOfficialSubscription(req.query as Record<string, unknown>);

    if (result.ok === false) {
      const reason = result.reason;
      if (reason === 'missing_hub_params') {
        return res
          .status(200)
          .type('text/plain')
          .send(
            'Webhook WhatsApp Oficial ativo. Configure no painel Meta com GET hub.mode=subscribe, hub.verify_token e hub.challenge.',
          );
      }
      console.warn('Webhook oficial: verificação recusada.', reason);
      return res.status(403).type('text/plain').send(`Forbidden: ${reason}`);
    }

    return res.status(200).send(result.challenge);
  }

  /** Meta Cloud API — eventos (POST). Responde 200 em até 20s (account_update, messages, …). */
  static async handleOfficial(req: Request, res: Response) {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await WebhookService.handleOfficial(body);
      const fields = Array.isArray(body.entry)
        ? (body.entry as Record<string, unknown>[]).flatMap((e) =>
            (Array.isArray(e.changes) ? e.changes : []).map((c) =>
              String((c as Record<string, unknown>).field ?? ''),
            ),
          )
        : [];
      console.log('Webhook oficial processado:', { fields, result });
      return res.status(200).type('text/plain').send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Erro no webhook oficial:', error);
      return res.status(200).type('text/plain').send('EVENT_RECEIVED');
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
