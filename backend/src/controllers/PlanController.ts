import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PlanService } from '../services/PlanService.js';

export class PlanController {
  /** Catálogo público de planos (landing, cadastro). */
  static list(_req: unknown, res: Response) {
    res.json(PlanService.listPublicPlans());
  }

  /** Plano atual do usuário com uso e limites. */
  static async mine(req: AuthRequest, res: Response) {
    try {
      const summary = await PlanService.getUserPlanSummary(req.user!.sub);
      res.json(summary);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
}
