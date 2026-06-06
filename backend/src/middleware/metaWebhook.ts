import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function parseMetaWebhookJson(req: Request, res: Response, next: NextFunction): void {
  const raw = req.body;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).type('text/plain').send('Expected raw body');
    return;
  }

  (req as Request & { rawBody?: Buffer }).rawBody = raw;

  try {
    req.body = JSON.parse(raw.toString('utf8'));
    next();
  } catch {
    res.status(400).type('text/plain').send('Invalid JSON');
  }
}

/** Valida X-Hub-Signature-256 quando META_APP_SECRET está definido; caso contrário aceita o POST (Meta envia para a callback URL). */
export function verifyMetaWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = (process.env.META_APP_SECRET || '').trim();
  if (!secret) {
    next();
    return;
  }

  const signature = req.get('x-hub-signature-256');
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature?.startsWith('sha256=') || !rawBody?.length) {
    res.status(403).type('text/plain').send('Forbidden: invalid signature');
    return;
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signature.slice(7);

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
    if (!valid) {
      res.status(403).type('text/plain').send('Forbidden: signature mismatch');
      return;
    }
  } catch {
    res.status(403).type('text/plain').send('Forbidden: signature mismatch');
    return;
  }

  next();
}
