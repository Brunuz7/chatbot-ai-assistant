import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { ConnectionService } from '../services/ConnectionService.js';

export class WhatsAppOfficialController {
  static getEmbeddedSignupConfig(_req: AuthRequest, res: Response) {
    res.json(ConnectionService.getEmbeddedSignupConfig());
  }

  static async completeEmbeddedSignup(req: AuthRequest, res: Response) {
    const { code, waba_id, phone_number_id, business_account_id, pin } = req.body ?? {};

    try {
      const result = await ConnectionService.completeEmbeddedSignup(req.user!.sub, {
        code,
        waba_id,
        phone_number_id,
        business_account_id,
        pin,
      });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no cadastro incorporado.';
      console.error('Erro no Embedded Signup:', message);
      res.status(400).json({ error: message });
    }
  }

  static async getStatus(req: AuthRequest, res: Response) {
    try {
      const status = await ConnectionService.getOfficialStatus(req.user!.sub);
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status WhatsApp Oficial:', error);
      res.status(500).json({ error: 'Não foi possível obter o status da conexão.' });
    }
  }

  static async disconnect(req: AuthRequest, res: Response) {
    try {
      const result = await ConnectionService.disconnectOfficial(req.user!.sub);
      res.json(result);
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp Oficial:', error);
      res.status(500).json({ error: 'Não foi possível desconectar.' });
    }
  }
}
