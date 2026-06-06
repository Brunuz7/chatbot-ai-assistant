import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { UserContactService } from '../services/UserContactService.js';

export class UserContactController {
  static async getContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const result = await UserContactService.listPaginated(userId, false, {
        page: typeof req.query.page === 'string' ? req.query.page : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        tag_id: typeof req.query.tag_id === 'string' ? req.query.tag_id : undefined,
      });
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);

      return res.status(500).json({
        error: 'Erro ao buscar contatos',
      });
    }
  }

  static async getBlockedContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const result = await UserContactService.listPaginated(userId, true, {
        page: typeof req.query.page === 'string' ? req.query.page : undefined,
        limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        tag_id: typeof req.query.tag_id === 'string' ? req.query.tag_id : undefined,
      });
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar bloqueados:', error);

      return res.status(500).json({ error: 'Erro ao buscar bloqueados' });
    }
  }

  static async blockContact(req: AuthRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const { reason, blockHours, blockedUntil } = req.body;
      const userId = req.user?.sub;

      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const contact = await UserContactService.blockContact(userId, id, {
        reason,
        blockHours,
        blockedUntil,
      });

      return res.json({
        message: 'Contato bloqueado com sucesso',
        contact,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'not_found')
        return res.status(404).json({ error: 'Contato não encontrado' });

      console.error('Erro ao bloquear contato:', error);

      return res.status(500).json({ error: 'Erro ao bloquear contato' });
    }
  }

  static async createContact(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const { name, phone_number, observation } = req.body ?? {};
      const contact = await UserContactService.create(userId, {
        name,
        phone_number: String(phone_number ?? ''),
        observation,
      });

      return res.status(201).json(contact);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'invalid_phone') return res.status(400).json({ error: 'Número de telefone inválido.' });

        if (error.message === 'duplicate_phone')
          return res.status(409).json({ error: 'Já existe um contato com este número.' });
      }
      console.error('Erro ao criar contato:', error);
      return res.status(500).json({ error: 'Erro ao criar contato' });
    }
  }

  static async updateContact(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const id = String(req.params.id);
      const { name, phone_number, observation, tag_id } = req.body ?? {};

      const contact = await UserContactService.update(userId, id, {
        ...(name !== undefined ? { name } : {}),
        ...(phone_number !== undefined ? { phone_number: String(phone_number) } : {}),
        ...(observation !== undefined ? { observation } : {}),
        ...(tag_id !== undefined ? { tag_id: tag_id === null ? null : String(tag_id) } : {}),
      });

      return res.json(contact);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'not_found') return res.status(404).json({ error: 'Contato não encontrado' });

        if (error.message === 'invalid_phone') return res.status(400).json({ error: 'Número de telefone inválido.' });

        if (error.message === 'duplicate_phone')
          return res.status(409).json({ error: 'Já existe um contato com este número.' });

        if (error.message === 'invalid_tag') return res.status(400).json({ error: 'Classificação inválida.' });
      }
      console.error('Erro ao atualizar contato:', error);
      return res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
  }

  static async deleteContact(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const id = String(req.params.id);
      await UserContactService.delete(userId, id);
      return res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'not_found')
        return res.status(404).json({ error: 'Contato não encontrado' });

      console.error('Erro ao excluir contato:', error);
      return res.status(500).json({ error: 'Erro ao excluir contato' });
    }
  }

  static async unblockContact(req: AuthRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.sub;

      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const contact = await UserContactService.unblockContact(userId, id);

      return res.json({ message: 'Contato desbloqueado com sucesso', contact });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'not_found')
        return res.status(404).json({ error: 'Contato não encontrado' });

      console.error('Erro ao desbloquear contato:', error);

      return res.status(500).json({ error: 'Erro ao desbloquear contato' });
    }
  }
}
