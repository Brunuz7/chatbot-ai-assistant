import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { BulkMessageService } from '../services/BulkMessageService.js';

function pickId(params: AuthRequest['params'], key = 'id'): string | null {
  const v = params[key];
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export class BulkMessageController {
  static async limits(req: AuthRequest, res: Response) {
    try {
      const limits = await BulkMessageService.getLimits(req.user!.sub);
      res.json(limits);
    } catch (err) {
      console.error('BulkMessage limits:', err);
      res.status(500).json({ error: 'Falha ao obter limites' });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const items = await BulkMessageService.listByUser(req.user!.sub);
      res.json(
        items.map((row) => ({
          ...row,
          tag_ids: Array.isArray(row.tag_ids) ? row.tag_ids : [],
        })),
      );
    } catch (err) {
      console.error('BulkMessage list:', err);
      res.status(500).json({ error: 'Falha ao listar campanhas' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await BulkMessageService.getById(req.user!.sub, id);
      res.json({
        ...row,
        tag_ids: Array.isArray(row.tag_ids) ? row.tag_ids : [],
      });
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      console.error('BulkMessage get:', err);
      res.status(500).json({ error: 'Falha ao carregar campanha' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, message, tag_ids, scheduled_at } = req.body ?? {};
      const row = await BulkMessageService.create(req.user!.sub, {
        name: name != null ? String(name) : null,
        message: String(message ?? ''),
        tag_ids: Array.isArray(tag_ids) ? tag_ids.map(String) : [],
        scheduled_at: String(scheduled_at ?? ''),
      });
      res.status(201).json(BulkMessageService.formatCampaign(row));
    } catch (err: unknown) {
      const code = (err as Error).message;
      const map: Record<string, { status: number; error: string }> = {
        invalid_message: { status: 400, error: 'Mensagem é obrigatória' },
        message_too_long: { status: 400, error: 'Mensagem demasiado longa' },
        invalid_schedule: { status: 400, error: 'Data de agendamento inválida' },
        schedule_too_soon: {
          status: 400,
          error: 'Agende com pelo menos alguns minutos de antecedência',
        },
        invalid_tags: { status: 400, error: 'Uma ou mais tags são inválidas' },
        no_recipients: { status: 400, error: 'Nenhum contato elegível para este grupo' },
        whatsapp_disconnected: {
          status: 400,
          error: 'WhatsApp desconectado. Ligue a instância antes de enviar.',
        },
        daily_campaign_limit: {
          status: 429,
          error: 'Limite diário de campanhas atingido',
        },
        daily_send_limit: {
          status: 429,
          error: 'Limite diário de mensagens atingido',
        },
      };
      if (map[code]) {
        return res.status(map[code].status).json({ error: map[code].error });
      }
      console.error('BulkMessage create:', err);
      res.status(500).json({ error: 'Falha ao criar campanha' });
    }
  }

  static async cancel(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await BulkMessageService.cancel(req.user!.sub, id);
      res.json(BulkMessageService.formatCampaign(row));
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      if ((err as Error).message === 'cannot_cancel') {
        return res.status(400).json({ error: 'Esta campanha já foi concluída ou cancelada' });
      }
      console.error('BulkMessage cancel:', err);
      res.status(500).json({ error: 'Falha ao cancelar' });
    }
  }

  static async pause(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await BulkMessageService.pause(req.user!.sub, id);
      res.json(BulkMessageService.formatCampaign(row));
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      if ((err as Error).message === 'cannot_pause') {
        return res.status(400).json({ error: 'Não é possível pausar esta campanha' });
      }
      console.error('BulkMessage pause:', err);
      res.status(500).json({ error: 'Falha ao pausar' });
    }
  }

  static async resume(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await BulkMessageService.resume(req.user!.sub, id);
      res.json(BulkMessageService.formatCampaign(row));
    } catch (err: unknown) {
      if ((err as Error).message === 'not_found') {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }
      if ((err as Error).message === 'cannot_resume') {
        return res.status(400).json({ error: 'A campanha não está pausada' });
      }
      if ((err as Error).message === 'whatsapp_disconnected') {
        return res.status(400).json({ error: 'WhatsApp desconectado' });
      }
      console.error('BulkMessage resume:', err);
      res.status(500).json({ error: 'Falha ao retomar' });
    }
  }
}
