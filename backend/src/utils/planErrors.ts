import type { Response } from 'express';
import { PlanLimitError } from '../services/PlanService.js';

export function respondPlanError(res: Response, err: unknown): boolean {
  if (!(err instanceof PlanLimitError)) return false;
  res.status(403).json({ error: err.code, message: err.message });
  return true;
}
