import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { ConnectionService } from '../services/ConnectionService.js';

export class ConnectionController {
  static async getOverview(req: AuthRequest, res: Response) {
    try {
      const overview = await ConnectionService.getOverview(req.user!.sub);
      res.json(overview);
    } catch (error) {
      console.error('Erro ao obter visão da conexão:', error);
      res.status(500).json({ error: 'Não foi possível carregar a conexão.' });
    }
  }

  static async setChannel(req: AuthRequest, res: Response) {
    const { channel } = req.body ?? {};
    try {
      const result = await ConnectionService.setChannel(req.user!.sub, channel);
      const overview = await ConnectionService.getOverview(req.user!.sub);
      res.json({ ...result, overview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).json({ error: message });
    }
  }

  static async toggleChatbot(req: AuthRequest, res: Response) {
    const { enabled } = req.body ?? {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled deve ser booleano' });
    }
    try {
      const result = await ConnectionService.toggleChatbot(req.user!.sub, enabled);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).json({ error: message });
    }
  }
}
