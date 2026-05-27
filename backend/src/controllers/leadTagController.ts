import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { TagService } from '../services/TagService.js';

function pickId(params: AuthRequest['params'], key = 'id'): string | null {
  const v = params[key];
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export class LeadTagController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const items = await TagService.listByUser(req.user!.sub);
      res.json(items);
    } catch (err) {
      console.error('LeadTag list:', err);
      res.status(500).json({ error: 'Falha ao listar tags' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, description, color, sort_order, is_active } = req.body ?? {};
      const row = await TagService.createForUser(req.user!.sub, {
        name: String(name ?? ''),
        description: description != null ? String(description) : null,
        color: color != null ? String(color) : null,
        sort_order: sort_order != null ? Number(sort_order) : undefined,
        is_active: is_active !== false,
      });
      res.status(201).json(row);
    } catch (err: unknown) {
      if ((err as Error).message === 'invalid_input') {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
      }
      if ((err as Error).message === 'duplicate_name') {
        return res.status(409).json({ error: 'Já existe uma tag com este nome' });
      }
      console.error('LeadTag create:', err);
      res.status(500).json({ error: 'Falha ao criar tag' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const { name, description, color, sort_order, is_active } = req.body ?? {};
      const row = await TagService.updateForUser(req.user!.sub, id, {
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(description !== undefined ? { description: description === null ? null : String(description) } : {}),
        ...(color !== undefined ? { color: color === null ? null : String(color) } : {}),
        ...(sort_order !== undefined ? { sort_order: Number(sort_order) } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      });
      res.json(row);
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') return res.status(404).json({ error: 'Tag não encontrada' });
      if ((err as Error).message === 'invalid_input') {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
      }
      if ((err as Error).message === 'duplicate_name') {
        return res.status(409).json({ error: 'Já existe uma tag com este nome' });
      }
      console.error('LeadTag update:', err);
      res.status(500).json({ error: 'Falha ao actualizar tag' });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      await TagService.deleteForUser(req.user!.sub, id);
      res.status(204).send();
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') return res.status(404).json({ error: 'Tag não encontrada' });
      console.error('LeadTag delete:', err);
      res.status(500).json({ error: 'Falha ao remover tag' });
    }
  }
}
