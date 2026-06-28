import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { KnowledgeBaseService, KNOWLEDGE_CONTENT_MAX_LENGTH } from '../services/KnowledgeBaseService.js';
import { respondPlanError } from '../utils/planErrors.js';

function pickParamId(params: AuthRequest['params']): string | null {
  const v = params.id;
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export class KnowledgeBaseController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const items = await KnowledgeBaseService.listByUser(req.user!.sub);
      res.json(items);
    } catch (err) {
      console.error('Knowledge list:', err);
      res.status(500).json({ error: 'Falha ao listar base de conhecimento' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { title, content, category } = req.body ?? {};
      const row = await KnowledgeBaseService.createForUser(req.user!.sub, {
        title: String(title ?? ''),
        content: String(content ?? ''),
        category: category != null ? String(category) : null,
      });
      res.status(201).json(row);
    } catch (err: unknown) {
      if (respondPlanError(res, err)) return;
      if ((err as Error).message === 'invalid_input')
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      if ((err as Error).message === 'invalid_store_catalog')
        return res.status(400).json({ error: 'Formato do catálogo da loja inválido' });

      console.error('Knowledge create:', err);
      res.status(500).json({ error: 'Falha ao criar artigo' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const idParam = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
      if (!idParam) return res.status(400).json({ error: 'ID inválido' });
      const { title, content, category } = req.body ?? {};
      const row = await KnowledgeBaseService.updateForUser(req.user!.sub, idParam, {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(category !== undefined ? { category: category === null ? null : String(category) } : {}),
      });
      res.json(row);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'not_found') return res.status(404).json({ error: 'Artigo não encontrado' });
      if (msg === 'invalid_input') return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      if (msg === 'content_too_long')
        return res.status(400).json({
          error: `Conteúdo excede o limite de ${KNOWLEDGE_CONTENT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres.`,
        });
      if (msg === 'invalid_store_catalog')
        return res.status(400).json({ error: 'Formato do catálogo da loja inválido' });
      console.error('Knowledge update:', err);
      res.status(500).json({ error: 'Falha ao actualizar artigo' });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      const idParam = pickParamId(req.params);
      if (!idParam) return res.status(400).json({ error: 'ID inválido' });
      await KnowledgeBaseService.deleteForUser(req.user!.sub, idParam);
      res.status(204).send();
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') return res.status(404).json({ error: 'Artigo não encontrado' });
      console.error('Knowledge delete:', err);
      res.status(500).json({ error: 'Falha ao remover artigo' });
    }
  }
}
