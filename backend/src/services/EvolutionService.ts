import { getBase64FromMediaMessageDto } from '../../../api-evolution/src/api/dto/chat.dto.js';
import axios from 'axios';
import MessageProcessor from './MessageProcessor.js';
import { prisma } from '../lib/prisma.js';
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
    if (!EVO_URL || !EVO_KEY) throw new Error('Evolution API not configured');

    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');

    const instanceName = this.sanitizeInstanceName(user.name || user.email.split('@')[0] || 'User', user.id);

    // Check if instance exists
    let instanceExists = false;
    try {
      const stateResponse = await axios.get(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVO_KEY },
      });

      if (stateResponse.data.instance.state === 'open')  return { connected: true, instanceName };
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
        headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
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
      where: { instance_id: instanceName },
      update: { status: 'CONNECTING' },
      create: { name: instanceName, instance_id: instanceName, user_id: user.id, status: 'CONNECTING' },
    });

    return { base64: qrcodeData.base64, code: qrcodeData.code, instanceName };
  }

  static async getInstanceStatus(userId: string) {
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
    } catch (_err) {
      connectionStatus = 'DISCONNECTED';
    }

    const connection = await prisma.connection.upsert({
      where: { instance_id: instanceName },
      update: { status: connectionStatus },
      create: { name: instanceName, instance_id: instanceName, user_id: user.id, status: connectionStatus },
    });

    return {
      connectionStatus,
      instanceName,
      chatbotEnabled: connection.chatbot_enabled || false,
    };
  }

  static async getMetrics(userId: string) {
    const status = await this.getInstanceStatus(userId);
    const activeAutomations = await prisma.automation.count({ where: { is_active: true } });

    return {
      activeAutomations: activeAutomations || 0,
      connectionStatus: status.connectionStatus,
      instanceName: status.instanceName,
      chatbotEnabled: status.chatbotEnabled,
    };
  }

  static async toggleChatbot(instanceName: string, enabled: boolean) {
    await prisma.connection.update({ where: { instance_id: instanceName }, data: { chatbot_enabled: enabled } });
    if (enabled) await this.setupWebhook(instanceName);
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
      const connection = await prisma.connection.findUnique({ where: { instance_id: instanceName } });
      if (!connection || !connection.chatbot_enabled) return { status: 'chatbot_disabled' };

      // Ignora se a mensagem for de um grupo (remoteJid contendo '@g.us')
      if (remoteJid && remoteJid.includes('@g.us')) return { status: 'ignored_group' };
      const incomingContent = message?.conversation || message?.extendedTextMessage?.text || 'Mídia/Outro';
      
      // Upsert conversation record. Store messages as an array of objects in the Json field.
      try {
        const existing = await prisma.conversation.findUnique({ where: { whatsapp_id: remoteJid } });
        const newMessageEntry = { direction: 'in', content: incomingContent, timestamp: new Date().toISOString() };

        if (existing) {
          const msgs = Array.isArray(existing.messages) ? existing.messages : (existing.messages as any) || [];
          msgs.push(newMessageEntry);
          await prisma.conversation.update({ where: { whatsapp_id: remoteJid }, data: { messages: msgs } });
        } else {
          const msgs = [newMessageEntry];
          await prisma.conversation.create({
            data: { phone_number: remoteJid.split('@')[0] || remoteJid, whatsapp_id: remoteJid,  messages: msgs },
          });
        }
      } catch (convErr: any) {
        console.warn('Erro ao upsert conversation:', convErr?.message || convErr);
      }

      const incomingText = incomingContent;
      const responseText = await MessageProcessor.processIncomingMessage(connection?.user_id ?? 'unknown', incomingText);
     console.log(`Resposta gerada para ${remoteJid}: ${responseText}`);
      const sendPayload = { number: remoteJid, text: responseText, delay: 1200, linkPreview: false } as any;
      const send = await this.sendMessage(instanceName, sendPayload);

      if (send) {     
        try {
          const existing = await prisma.conversation.findUnique({ where: { whatsapp_id: remoteJid } });
          const outMsg = { direction: 'out', content: responseText, timestamp: new Date().toISOString() };
          if (existing) {
            const msgs = Array.isArray(existing.messages) ? existing.messages : (existing.messages as any) || [];
            msgs.push(outMsg);
            await prisma.conversation.update({ where: { whatsapp_id: remoteJid }, data: { messages: msgs } });
          } else {
            await prisma.conversation.create({ data: { phone_number: remoteJid.split('@')[0] || remoteJid, whatsapp_id: remoteJid, messages: [outMsg] } });
          }
        } catch (convErr: any) {
          console.warn('Erro ao anexar mensagem de saída na conversation:', convErr?.message || convErr);
        }
      }

      return { status: 'responded', message: responseText };
  }

  static async sendMessage(instanceName: string, payload: any) {
    if (!EVO_URL || !EVO_KEY) return false;

    try {
      const res = await axios.post(
        `${EVO_URL}/message/sendText/${instanceName}`,
        payload,
        { headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' } },
      );
      return res.data;
    } catch (err: any) {
      return false;
    }
  }
}
