import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { ConnectionService } from '../services/ConnectionService.js';

export class EvolutionController {
  static async getQRCode(req: AuthRequest, res: Response) {
    try {
      const result = await ConnectionService.getQRCode(req.user!.sub);
      res.json(result);
    } catch (error: any) {
      console.error('ERRO NO FLUXO DE QR CODE:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Failed to get QR code',
        details: error.response?.data || error.message,
      });
    }
  }

  static async getMetrics(req: AuthRequest, res: Response) {
    try {
      const metrics = await ConnectionService.getMetrics(req.user!.sub);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  static async getInstanceStatus(req: AuthRequest, res: Response) {
    try {
      const status = await ConnectionService.getInstanceStatus(req.user!.sub);
      res.json(status);
    } catch (error) {
      console.error('Error fetching instance status:', error);
      res.status(500).json({ error: 'Failed to fetch instance status' });
    }
  }

  static async toggleChatbot(req: AuthRequest, res: Response) {
    const { instanceName, enabled } = req.body;
    try {
      const chatbotEnabled = await ConnectionService.toggleEvolutionChatbot(instanceName, enabled);
      res.json({ success: true, chatbotEnabled });
    } catch (error: any) {
      console.error('Erro ao alternar chatbot:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to toggle chatbot', details: error.response?.data || error.message });
    }
  }

}
