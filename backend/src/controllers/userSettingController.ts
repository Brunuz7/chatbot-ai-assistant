import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { UserSettingService } from '../services/UserSettingService.js';
import type { UpdateTtsReplyBody } from '../types/userSettingTypes.js';

export class UserSettingController {
  static async getMine(req: AuthRequest, res: Response) {
    try {
      const row = await UserSettingService.getOrCreate(req.user!.sub);
      res.json(row);
    } catch (err) {
      console.error('UserSetting get:', err);
      res.status(500).json({ error: 'Falha ao carregar configurações' });
    }
  }

  static async updateLeadQualification(req: AuthRequest, res: Response) {
    try {
      const { tagging_enabled } = req.body ?? {};
      if (typeof tagging_enabled !== 'boolean') {
        return res.status(400).json({ error: 'tagging_enabled deve ser booleano' });
      }
      const row = await UserSettingService.updateLeadQualification(
        req.user!.sub,
        tagging_enabled,
      );
      res.json(row);
    } catch (err) {
      console.error('UserSetting lead qualification:', err);
      res.status(500).json({ error: 'Falha ao actualizar qualificação de leads' });
    }
  }

  static async updateTtsReply(req: AuthRequest, res: Response) {
    try {
      const body = (req.body ?? {}) as UpdateTtsReplyBody;

      if (
        body.tts_voice_type === 'clone' &&
        !(await UserSettingService.getVoiceCloneStatus(req.user!.sub)).has_cloned_voice
      ) {
        return res.status(400).json({
          error: 'Envie uma amostra de voz antes de activar o modo clonado.',
        });
      }

      const row = await UserSettingService.updateTtsReply(req.user!.sub, body);
      res.json(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      if (message.includes('inválido') || message.includes('vazio')) {
        return res.status(400).json({ error: message });
      }
      console.error('UserSetting tts reply:', err);
      res.status(500).json({ error: 'Falha ao actualizar respostas em áudio' });
    }
  }

  static async getVoiceCloneStatus(req: AuthRequest, res: Response) {
    try {
      const status = await UserSettingService.getVoiceCloneStatus(req.user!.sub);
      res.json(status);
    } catch (err) {
      console.error('UserSetting voice clone status:', err);
      res.status(500).json({ error: 'Falha ao carregar estado da voz clonada' });
    }
  }

  static async uploadVoiceClone(req: AuthRequest, res: Response) {
    try {
      const result = await UserSettingService.uploadVoiceClone(req.user!.sub, req.body ?? {});
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      if (
        message.includes('obrigatório') ||
        message.includes('inválido') ||
        message.includes('curto') ||
        message.includes('grande') ||
        message.includes('suportado') ||
        message.includes('MISTRAL_API_KEY')
      ) {
        return res.status(400).json({ error: message });
      }
      console.error('UserSetting upload voice clone:', err);
      res.status(500).json({ error: 'Falha ao clonar voz' });
    }
  }

  static async deleteVoiceClone(req: AuthRequest, res: Response) {
    try {
      const result = await UserSettingService.removeVoiceClone(req.user!.sub);
      res.json(result);
    } catch (err) {
      console.error('UserSetting delete voice clone:', err);
      res.status(500).json({ error: 'Falha ao remover voz clonada' });
    }
  }
}
