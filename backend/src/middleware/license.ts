import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { SubscriptionService } from '../services/SubscriptionService.js';

/**
 * Middleware de verificação de licença.
 * Deve ser usado APÓS o `requireAuth`, pois depende de `req.user.email`.
 *
 * Bloqueia o acesso com HTTP 403 se:
 *  - A empresa estiver com status BLOCKED, INACTIVE ou CANCELLED.
 *  - A assinatura estiver EXPIRED, CANCELLED, PAST_DUE ou com data vencida.
 *  - O período de trial tiver expirado.
 */
export async function requireLicense(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = req.user?.email;

    // Se por algum motivo o email não estiver no token, deixa passar
    // (o requireAuth já garantiu a autenticação)
    if (!email) {
      next();
      return;
    }

    const result = await SubscriptionService.checkLicense(email);

    if (!result.allowed) {
      const blocked = result as { allowed: false; reason: string; message: string };
      res.status(403).json({
        error: 'license_expired',
        reason: blocked.reason,
        message: blocked.message,
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[requireLicense] Erro ao verificar licença:', err);
    // Em caso de erro na verificação, permite o acesso para não derrubar o serviço
    next();
  }
}
