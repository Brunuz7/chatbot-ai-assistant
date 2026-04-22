import axios from 'axios';
import MessageProcessor from './messageProcessor.js';
import { prisma } from './../lib/prisma.js';
import { findUserById } from '../authStore.js';

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3001}/api/webhook/evolution`;

export class EvolutionService {
  static sanitizeInstanceName(name: string, id: string) {
    const sanitized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_${id.slice(0, 4)}`;
  }

  static async setupWebhook(instanceName: string) {
    console.log(`🔗 Configurando webhook para ${instanceName} em ${WEBHOOK_URL}`);
    try {
      await axios.post(`${EVO_URL}/webhook/set/${instanceName}`, {
        enabled: true,
        url: WEBHOOK_URL,
        byEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      }, {
        headers: { apikey: EVO_KEY },
      });
      console.log(`✅ Webhook configurado com sucesso para ${instanceName}`);
    } catch (err: any) {
      console.error(`❌ Erro ao configurar webhook para ${instanceName}:`, err.response?.data || err.message);
    }
  }

  static async getQRCode(userId: string) {
    if (!EVO_URL || !EVO_KEY) {
      throw new Error('Evolution API not configured');
    }

    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const instanceName = this.sanitizeInstanceName(user.name || user.email.split('@')[0] || 'User', user.id);

    // Check if instance exists
    let instanceExists = false;
    try {
      const stateResponse = await axios.get(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVO_KEY },
      });

      if (stateResponse.data.instance.state === 'open') {
        return { connected: true, instanceName };
      }
      instanceExists = true;
    } catch (err: any) {
      if (err.response?.status === 404) {
        instanceExists = false;
      } else {
        throw err;
      }
    }

    // Create instance if not found
    if (!instanceExists) {
      await axios.post(`${EVO_URL}/instance/create`, {
        instanceName: instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          enabled: true,
          url: WEBHOOK_URL,
          byEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      }, {
        headers: {
          apikey: EVO_KEY,
          'Content-Type': 'application/json',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Get QR Code
    const connectResponse = await axios.get(`${EVO_URL}/instance/connect/${instanceName}`, {
      headers: { apikey: EVO_KEY },
    });

    const qrcodeData = connectResponse.data.qrcode || connectResponse.data;

    // Save or update connection in DB
    await prisma.connection.upsert({
      where: { instanceId: instanceName },
      update: { status: 'CONNECTING' },
      create: {
        name: instanceName,
        instanceId: instanceName,
        userId: user.id,
        status: 'CONNECTING',
      },
    });

    return {
      base64: qrcodeData.base64,
      code: qrcodeData.code,
      instanceName,
    };
  }

  static async getMetrics(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');

    const instanceName = this.sanitizeInstanceName(user.name || user.email.split('@')[0] || 'User', user.id);

    let connectionStatus = 'DISCONNECTED';

    try {
      const stateResponse = await axios.get(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVO_KEY },
      });

      const state = stateResponse.data.instance.state;
      if (state === 'open') {
        connectionStatus = 'CONNECTED';
      } else if (state === 'connecting') {
        connectionStatus = 'CONNECTING';
      }
    } catch (err) {
      connectionStatus = 'DISCONNECTED';
    }

    await prisma.connection.upsert({
      where: { instanceId: instanceName },
      update: { status: connectionStatus },
      create: {
        name: instanceName,
        instanceId: instanceName,
        userId: user.id,
        status: connectionStatus,
      },
    });

    const activeConversations = await prisma.messageLog.groupBy({
      by: ['from'],
      _count: true,
    });

    const messageVolume = await prisma.messageLog.count();
    const contactsCount = await prisma.contact.count();
    const activeAutomations = await prisma.automation.count({ where: { isActive: true } });
    const connection = await prisma.connection.findUnique({ where: { instanceId: instanceName } });

    return {
      activeConversations: activeConversations.length || 0,
      messageVolume: messageVolume || 0,
      contactsCount: contactsCount || 0,
      activeAutomations: activeAutomations || 0,
      connectionStatus: connectionStatus,
      instanceName: instanceName,
      chatbotEnabled: connection?.chatbotEnabled || false,
    };
  }

  static async toggleChatbot(instanceName: string, enabled: boolean) {
    await prisma.connection.update({
      where: { instanceId: instanceName },
      data: { chatbotEnabled: enabled },
    });

    if (enabled) {
      await this.setupWebhook(instanceName);
    }

    return enabled;
  }

  static async handleWebhook(event: any) {
    if (event.event !== 'messages.upsert') return { status: 'ignored' };

    const data = event.data;
    const message = data.message;
    const instanceName = event.instance;
    const fromMe = data.key.fromMe;
    const remoteJid = data.key.remoteJid;

    if (fromMe) return { status: 'fromMe_ignored' };
    const connection = await prisma.connection.findUnique({ where: { instanceId: instanceName } });
    if (!connection || !connection.chatbotEnabled) return { status: 'chatbot_disabled' };

    await prisma.messageLog.create({
      data: {
        from: remoteJid,
        to: 'me',
        content: message?.conversation || message?.extendedTextMessage?.text || 'Mídia/Outro',
        status: 'received',
      },
    });

    const incomingText = message?.conversation || message?.extendedTextMessage?.text || 'Mídia/Outro';
    let responseText: string;

    try {
      responseText = await MessageProcessor.processIncomingMessage(connection?.userId ?? 'unknown', incomingText);
    } catch (err: any) {
      console.error('Erro ao processar mensagem via MessageProcessor:', err?.message || err);
      responseText = 'Desculpe, não consegui processar sua mensagem agora.';
    }

    const sendPayload = {
      number: remoteJid,
      options: { delay: 1200, presence: 'composing', linkPreview: false },
      textMessage: { text: responseText }
    };

    try {
      await axios
        .post(`${EVO_URL}/message/sendText/${instanceName}`, sendPayload, { headers: { apikey: EVO_KEY } });
    } catch (err: any) {
      console.error('Erro ao enviar mensagem via Evolution API:', err?.message || err);
    }

    await prisma.messageLog.create({
      data: {
        from: 'me',
        to: remoteJid,
        content: responseText,
        status: 'sent',
      },
    });

    return { status: 'responded', message: responseText };
  }
}
