import { Request, Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { EvolutionService } from '../services/EvolutionService.js';

export class EvolutionController {
  static async getQRCode(req: AuthRequest, res: Response) {
    try {
      const result = await EvolutionService.getQRCode(req.user!.sub);
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
      const metrics = await EvolutionService.getMetrics(req.user!.sub);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  static async getInstanceStatus(req: AuthRequest, res: Response) {
    try {
      const status = await EvolutionService.getInstanceStatus(req.user!.sub);
      res.json(status);
    } catch (error) {
      console.error('Error fetching instance status:', error);
      res.status(500).json({ error: 'Failed to fetch instance status' });
    }
  }

  static async toggleChatbot(req: AuthRequest, res: Response) {
    const { instanceName, enabled } = req.body;
    try {
      const chatbotEnabled = await EvolutionService.toggleChatbot(instanceName, enabled);
      res.json({ success: true, chatbotEnabled });
    } catch (error: any) {
      console.error('Erro ao alternar chatbot:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to toggle chatbot', details: error.response?.data || error.message });
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    try {
      const result = await EvolutionService.handleWebhook(req.body);
      const statusCode = result.status === 'queued' ? 202 : 200;
      res.status(statusCode).json(result);
    } catch (error: any) {
      console.error('❌ Erro no processamento do webhook:', error.response?.data || error.message);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}
