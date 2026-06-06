import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { prisma } from '../prisma.js';
import { EvolutionService } from '../services/EvolutionService.js';
import { WhatsAppService } from '../services/WhatsAppService.js';
import { UserSettingService } from '../services/UserSettingService.js';

async function buildOverview(userId: string) {
  const whatsapp_channel = await UserSettingService.getWhatsappChannel(userId);
  const evolution = await EvolutionService.getInstanceStatus(userId);
  const official = await WhatsAppService.getStatus(userId);
  const officialChatbotEnabled = await WhatsAppService.getChatbotEnabled(userId);

  const evolutionConnected = evolution.connectionStatus === 'CONNECTED';
  const officialConnected = official.connected;

  const activeConnected = whatsapp_channel === 'official' ? officialConnected : evolutionConnected;
  const activeChatbotEnabled =
    whatsapp_channel === 'official' ? officialChatbotEnabled : evolution.chatbotEnabled;

  return {
    whatsapp_channel,
    evolution: {
      connectionStatus: evolution.connectionStatus,
      instanceName: evolution.instanceName,
      chatbotEnabled: evolution.chatbotEnabled,
      connected: evolutionConnected,
    },
    official: {
      ...official,
      chatbotEnabled: officialChatbotEnabled,
    },
    active: {
      channel: whatsapp_channel,
      connected: activeConnected,
      chatbotEnabled: activeChatbotEnabled,
      connectionStatus:
        whatsapp_channel === 'official'
          ? officialConnected
            ? 'CONNECTED'
            : 'DISCONNECTED'
          : evolution.connectionStatus,
      instanceName:
        whatsapp_channel === 'official'
          ? official.display_phone || official.verified_name || official.phone_number_id || 'WhatsApp Oficial'
          : evolution.instanceName,
    },
  };
}

export class ConnectionController {
  static async list(_req: AuthRequest, res: Response) {
    try {
      const connections = await prisma.connection.findMany();
      res.json(connections);
    } catch {
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  }

  static async listAutomations(_req: AuthRequest, res: Response) {
    res.json([]);
  }

  static async getOverview(req: AuthRequest, res: Response) {
    try {
      res.json(await buildOverview(req.user!.sub));
    } catch (error) {
      console.error('Erro ao obter visão da conexão:', error);
      res.status(500).json({ error: 'Não foi possível carregar a conexão.' });
    }
  }

  static async setChannel(req: AuthRequest, res: Response) {
    const { channel } = req.body ?? {};
    try {
      const result = await UserSettingService.setWhatsappChannel(req.user!.sub, channel);
      const overview = await buildOverview(req.user!.sub);
      res.json({ ...result, overview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).json({ error: message });
    }
  }

  static async toggleChatbot(req: AuthRequest, res: Response) {
    const { enabled } = req.body ?? {};
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled deve ser booleano' });

    try {
      const channel = await UserSettingService.getWhatsappChannel(req.user!.sub);
      const result =
        channel === 'official'
          ? await WhatsAppService.toggleChatbot(req.user!.sub, enabled)
          : await EvolutionService.toggleChatbotForUser(req.user!.sub, enabled);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(400).json({ error: message });
    }
  }

  static async getQRCode(req: AuthRequest, res: Response) {
    const QR_USER_ERRORS: Record<string, { status: number; error: string }> = {
      evolution_not_configured: { status: 503, error: 'whatsapp_nao_configurado' },
      evolution_unauthorized: { status: 503, error: 'whatsapp_servico_indisponivel' },
      evolution_unreachable: { status: 503, error: 'whatsapp_servico_indisponivel' },
      qrcode_unavailable: { status: 503, error: 'qrcode_indisponivel' },
      user_not_found: { status: 404, error: 'usuario_nao_encontrado' },
    };

    try {
      const result = await EvolutionService.getQRCode(req.user!.sub);
      res.json(result);
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : 'qrcode_indisponivel';
      const mapped = QR_USER_ERRORS[code] ?? { status: 503, error: 'qrcode_indisponivel' };
      console.error('Erro ao gerar QR Code:', code, error);
      res.status(mapped.status).json({ error: mapped.error });
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

  static async toggleEvolutionChatbot(req: AuthRequest, res: Response) {
    const { instanceName, enabled } = req.body;
    try {
      const chatbotEnabled = await EvolutionService.toggleChatbot(instanceName, enabled);
      res.json({ success: true, chatbotEnabled });
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error('Erro ao alternar chatbot:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to toggle chatbot', details: err.response?.data || err.message });
    }
  }

  static async getOfficialStatus(req: AuthRequest, res: Response) {
    try {
      const status = await WhatsAppService.getStatus(req.user!.sub);
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status WhatsApp Oficial:', error);
      res.status(500).json({ error: 'Não foi possível obter o status da conexão.' });
    }
  }

  static async startOfficialSignup(req: AuthRequest, res: Response) {
    try {
      const result = await WhatsAppService.markSignupPending(req.user!.sub);
      res.json(result);
    } catch (error) {
      console.error('Erro ao iniciar cadastro WhatsApp Oficial:', error);
      res.status(500).json({ error: 'Não foi possível iniciar o cadastro.' });
    }
  }

  static async disconnectOfficial(req: AuthRequest, res: Response) {
    try {
      const result = await WhatsAppService.disconnect(req.user!.sub);
      res.json(result);
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp Oficial:', error);
      res.status(500).json({ error: 'Não foi possível desconectar.' });
    }
  }
}
