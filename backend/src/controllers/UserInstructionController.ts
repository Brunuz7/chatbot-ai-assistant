import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { UserSettingService } from '../services/UserSettingService.js';

export class UserInstructionController {
  static async getMine(req: AuthRequest, res: Response) {
    try {
      const result = await UserSettingService.getInstruction(req.user!.sub);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar instrução:', error);
      res.status(500).json({ error: 'Failed to get instruction' });
    }
  }

  static async upsertMine(req: AuthRequest, res: Response) {
    const { content, is_active } = req.body || {};
    try {
      const saved = await UserSettingService.upsertInstruction(req.user!.sub, content, is_active ?? true);
      res.json(saved);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'invalid_input')
        return res.status(400).json({ error: 'invalid_input' });

      console.error('Erro ao salvar instrução:', error);
      res.status(500).json({ error: 'Failed to save instruction' });
    }
  }
}
