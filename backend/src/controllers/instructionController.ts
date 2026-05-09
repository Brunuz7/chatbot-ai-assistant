import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { InstructionService } from '../services/InstructionService.js';

export class InstructionController {
  static async getMine(req: AuthRequest, res: Response) {
    try {
      const result = await InstructionService.getByUser(req.user!.sub);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar instrução:', error);
      res.status(500).json({ error: 'Failed to get instruction' });
    }
  }

  static async upsertMine(req: AuthRequest, res: Response) {
    const { content, is_active } = req.body || {};
    try {
      const saved = await InstructionService.upsertByUser(req.user!.sub, content, is_active ?? true);
      res.json(saved);
    } catch (error: any) {
      if (error.message === 'invalid_input') {
        return res.status(400).json({ error: 'invalid_input' });
      }
      console.error('Erro ao salvar instrução:', error);
      res.status(500).json({ error: 'Failed to save instruction' });
    }
  }
}
