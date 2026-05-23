import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { ConversationService } from '../services/ConversationService.js';

export class ConversationController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const result = await ConversationService.listForUser(userId, {
        page: typeof req.query.page === 'string' ? req.query.page : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao listar conversas:', error);
      return res.status(500).json({ error: 'Erro ao listar conversas' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
      if (!id) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const row = await ConversationService.getByIdForUser(userId, id);
      return res.json(row);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'not_found') {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }
      console.error('Erro ao buscar conversa:', error);
      return res.status(500).json({ error: 'Erro ao buscar conversa' });
    }
  }
}
