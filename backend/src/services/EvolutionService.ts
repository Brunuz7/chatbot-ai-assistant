import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { findUserById } from '../authStore.js';
import { FlowService } from './FlowService.js';
import type { FlowProcessResult, OutboundButtons } from '../types/flow.types.js';

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3001}/api/webhook/evolution`;

export class EvolutionService {
  private static normalizeWebhookEvent(raw: string | undefined): string {
    if (!raw) return '';
    return String(raw).trim().toLowerCase().replace(/_/g, '.');
  }

  private static decodeWebhookBody(event: Record<string, unknown>): Record<string, unknown> {
    const data = event.data;
    if (typeof data === 'string') {
      try {
        const json = Buffer.from(data, 'base64').toString('utf8');
        return { ...event, data: JSON.parse(json) };
      } catch {
        return event;
      }
    }
    return event;
  }

  private static extractInboundText(message: Record<string, unknown> | undefined | null): string {
    if (!message) return '';
    const m = message as Record<string, unknown>;

    const buttonsResp = m.buttonsResponseMessage as Record<string, unknown> | undefined;
    const templateBtn = m.templateButtonReplyMessage as Record<string, unknown> | undefined;
    const listResp = m.listResponseMessage as Record<string, unknown> | undefined;
    const listSel = listResp?.singleSelectReply as Record<string, unknown> | undefined;

    const btnId = buttonsResp?.selectedButtonId ?? templateBtn?.selectedId ?? listSel?.selectedRowId;

    const btnText = buttonsResp?.selectedDisplayText;

    if (btnId != null && String(btnId).trim()) return String(btnId).trim();
    if (btnText != null && String(btnText).trim()) return String(btnText).trim();

    const conv = m.conversation as string | undefined;
    if (conv && conv.trim()) return conv.trim();

    const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
    if (ext?.text && String(ext.text).trim()) return String(ext.text).trim();

    const speech = (m as Record<string, unknown>).speechToText as string | undefined;
    if (speech && speech.trim()) return speech.trim();

    // 🔥 ADICIONA AQUI
    const image = m.imageMessage as Record<string, unknown> | undefined;
    if (image?.caption && String(image.caption).trim()) {
      return String(image.caption).trim();
    }

    const video = m.videoMessage as Record<string, unknown> | undefined;
    if (video?.caption && String(video.caption).trim()) {
      return String(video.caption).trim();
    }

    return '';
  }

  static sanitizeInstanceName(name: string, id: string) {
    const sanitized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_${id.slice(0, 4)}`;
  }

  static async setupWebhook(instanceName: string) {
    if (!EVO_URL || !EVO_KEY) return;
    try {
      await axios.post(
        `${EVO_URL}/webhook/set/${instanceName}`,
        {
          enabled: true,
          url: WEBHOOK_URL,
          byEvents: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
        {
          headers: { apikey: EVO_KEY },
        },
      );
      console.log(`Webhook configurado para ${instanceName}`);
    } catch (err: any) {
      console.error(`Erro ao configurar webhook para ${instanceName}:`, err.response?.data || err.message);
    }
  }

  static async getQRCode(userId: string) {
    if (!EVO_URL || !EVO_KEY) throw new Error('Evolution API not configured');

    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');

    const instanceName = this.sanitizeInstanceName(user.name || user.email.split('@')[0] || 'User', user.id);

    let instanceExists = false;
    try {
      const stateResponse = await axios.get(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVO_KEY },
      });

      if (stateResponse.data.instance.state === 'open') return { connected: true, instanceName };
      instanceExists = true;
    } catch (err: any) {
      if (err.response?.status === 404) {
        instanceExists = false;
      } else {
        throw err;
      }
    }

    if (!instanceExists) {
      await axios.post(
        `${EVO_URL}/instance/create`,
        {
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
        },
        {
          headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const connectResponse = await axios.get(`${EVO_URL}/instance/connect/${instanceName}`, {
      headers: { apikey: EVO_KEY },
    });

    const qrcodeData = connectResponse.data.qrcode || connectResponse.data;

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

    return {
      activeAutomations: 0,
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

  static async handleWebhook(rawEvent: Record<string, unknown>) {
    console.log("EVENTO BRUTO:", rawEvent);

    const event = this.decodeWebhookBody(rawEvent);
    const ev = this.normalizeWebhookEvent(event.event as string | undefined);
    if (ev && ev !== 'messages.upsert') return { status: 'ignored', reason: event.event };
    console.log("EVENTO NORMALIZADO:", ev);
    const data = event.data as Record<string, unknown> | undefined;
    if (!data) return { status: 'ignored', reason: 'no_data' };

    const key = data.key as Record<string, unknown> | undefined;
    const message = data.message as Record<string, unknown> | undefined;
    const instanceName = event.instance as string;
    const fromMe = key?.fromMe === true || key?.fromMe === 'true';

    // const remoteJid = (key?.remoteJid as string) || '';

    let remoteJid =
      (key?.remoteJidAlt as string) ||
      (key?.remoteJid as string) ||
      '';

    if (remoteJid.includes('@lid') && key?.remoteJidAlt) {
      remoteJid = key.remoteJidAlt as string;
    }

    if (fromMe || !remoteJid) return { status: 'fromMe_ignored' };

    const connection = await prisma.connection.findUnique({
      where: { instance_id: instanceName }
    });

    console.log("INSTANCE RECEBIDA:", instanceName);
    console.log("REMOTE JID:", remoteJid);
    console.log("MENSAGEM:", message);

    if (!connection) {
      return { status: 'connection_not_found' };
    }

    const cleanPhone = remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@lid', '');


    console.log("============== WEBHOOK ==============");
    console.log(JSON.stringify(data, null, 2));
    console.log("=====================================");

    let contact = await prisma.user_contact.findFirst({
      where: {
        user_id: connection.user_id,
        phone_number: cleanPhone
      }
    });

    /*
 /*
====================================
CAPTURA NOME REAL
====================================
*/

    let contactName: string | null = null;

    // prioridade 1 → webhook
    contactName =
      (data?.pushName as string) ||
      (data?.notifyName as string) ||
      (data?.senderPushName as string) ||
      (data?.verifiedBizName as string) ||
      null;


    // prioridade 2 → buscar no payload interno da mensagem
    if (!contactName && message) {
      const extended = message.extendedTextMessage as any;
      const contextInfo = extended?.contextInfo;

      contactName =
        contextInfo?.participantName ||
        contextInfo?.quotedMessage?.pushName ||
        null;
    }


    // prioridade 3 → buscar na Evolution API
    if (!contactName) {
      try {
        const response = await axios.get(
          `${EVO_URL}/chat/findContacts/${instanceName}`,
          {
            headers: {
              apikey: EVO_KEY || ""
            }
          }
        );

        const contacts = response.data?.contacts || [];

        const foundContact = contacts.find(
          (c: any) =>
            c.id === remoteJid ||
            c.remoteJid === remoteJid ||
            c.number === cleanPhone
        );

        if (foundContact) {
          contactName =
            foundContact.pushName ||
            foundContact.profileName ||
            foundContact.name ||
            foundContact.notify ||
            null;
        }

      } catch (error) {
        console.log("Erro ao buscar nome:", error);
      }
    }


    // prioridade 4 → manter nome existente
    if (!contactName && contact?.name) {
      contactName = contact.name;
    }


    // prioridade 5 → fallback final
    if (!contactName) {
      contactName = "Sem nome";
    }

    console.log("NOME FINAL:", contactName);
    /*
    ====================================
    SALVA CONTATO
    ====================================
    */

    if (!contact) {
      contact = await prisma.user_contact.create({
        data: {
          user_id: connection.user_id,
          phone_number: cleanPhone,
          whatsapp_id: remoteJid,
          name: contactName
        }
      });

    } else {
      await prisma.user_contact.update({
        where: {
          id: contact.id
        },
        data: {
          name: contactName || contact.name
        }
      });
    }

    /*
    ====================================
    VERIFICA SE ESTÁ BLOQUEADO
    ====================================
    */
    if (contact.blocked) {
      console.log(
        `🚫 Contato bloqueado (${cleanPhone}) tentou enviar mensagem.`
      );

      return {
        status: "contact_blocked",
        phone: cleanPhone
      };
    }

    /*
    ====================================
    VERIFICA BLOQUEIO TEMPORÁRIO
    ====================================
    */
    if (
      contact.blocked_until &&
      new Date(contact.blocked_until) > new Date()
    ) {
      console.log(
        `⏳ Contato ${cleanPhone} bloqueado até ${contact.blocked_until}`
      );

      return {
        status: "temporarily_blocked",
        phone: cleanPhone
      };
    }

    /*
    ====================================
    DESBLOQUEIO AUTOMÁTICO
    ====================================
    */
    if (
      contact.blocked &&
      contact.blocked_until &&
      new Date(contact.blocked_until) <= new Date()
    ) {
      await prisma.user_contact.update({
        where: {
          id: contact.id
        },
        data: {
          blocked: false,
          blocked_at: null,
          blocked_until: null,
          block_reason: null
        }
      });

      console.log(
        `✅ Contato ${cleanPhone} desbloqueado automaticamente`
      );
    }
    // termina aqui

    console.log("Chatbot enabled:", connection.chatbot_enabled);

    if (!connection || !connection.chatbot_enabled) {
      console.log("❌ Chatbot desativado");
      return { status: 'chatbot_disabled' };
    } if (
      remoteJid.includes('@g.us') ||
      (key?.remoteJid as string)?.includes('@g.us')
    ) {
      return { status: 'ignored_group' };
    }
    const incomingContent = this.extractInboundText(message) || 'Mídia/Outro';

    console.log("INSTANCE RECEBIDA:", instanceName);
    console.log("REMOTE JID:", remoteJid);
    console.log("MENSAGEM PROCESSADA:", incomingContent);
    try {
      const existing = await prisma.conversation.findUnique({ where: { whatsapp_id: remoteJid } });
      const newMessageEntry = { direction: 'in', content: incomingContent, timestamp: new Date().toISOString() };

      if (existing) {
        const msgs = Array.isArray(existing.messages) ? [...(existing.messages as unknown[])] : [];
        msgs.push(newMessageEntry);
        await prisma.conversation.update({ where: { whatsapp_id: remoteJid }, data: { messages: msgs as any } });
      } else {
        await prisma.conversation.create({ data: { phone_number: remoteJid.split('@')[0] || remoteJid, whatsapp_id: remoteJid, messages: [newMessageEntry] as any } });
      }
    } catch (convErr: any) {
      console.warn('Erro ao registar conversa:', convErr?.message || convErr);
    }

    const incomingText = incomingContent;

    let result: FlowProcessResult;
    try {
      result = await FlowService.processMessage(
        connection.user_id,
        remoteJid.split('@')[0] || remoteJid,
        remoteJid,
        incomingText,
        connection.id,
        ev || (event.event as string) || null,
      );
    } catch (err: unknown) {
      console.error('FlowService.processMessage falhou:', err instanceof Error ? err.message : err);
      const fallback: FlowProcessResult = {
        outbound: [
          {
            kind: 'text',
            text: 'Não foi possível processar sua mensagem agora. Tente novamente em instantes.',
            delayMs: 1200,
          },
        ],
      };
      result = fallback;
    }

    const outbound = result.outbound || [];
    console.log("OUTBOUND GERADO:", JSON.stringify(outbound, null, 2));

    for (const item of outbound) {
      if (item.kind === 'text') {
        await this.sendMessage(instanceName, { number: remoteJid, text: item.text, delay: item.delayMs ?? 1200, linkPreview: false });
      } else if (item.kind === 'buttons') {
        await this.sendButtons(instanceName, remoteJid, item);
      }
    }

    const lastPart = outbound[outbound.length - 1];
    const lastText =
      outbound.length === 0
        ? ''
        : lastPart.kind === 'text'
          ? lastPart.text
          : this.formatButtonsAsPlainText(lastPart);

    if (outbound.length > 0) {
      try {
        const existing = await prisma.conversation.findUnique({ where: { whatsapp_id: remoteJid } });
        const outMsg = { direction: 'out', content: lastText, timestamp: new Date().toISOString() };
        if (existing) {
          const msgs = Array.isArray(existing.messages) ? [...(existing.messages as unknown[])] : [];
          msgs.push(outMsg);
          await prisma.conversation.update({ where: { whatsapp_id: remoteJid }, data: { messages: msgs as any } });
        } else {
          await prisma.conversation.create({
            data: {
              phone_number: remoteJid.split('@')[0] || remoteJid,
              whatsapp_id: remoteJid,
              messages: [outMsg] as any,
            },
          });
        }
      } catch (convErr: any) {
        console.warn('Erro ao registar mensagem de saída:', convErr?.message || convErr);
      }
    }

    return { status: 'responded', outboundCount: outbound.length };
  }

  static async sendMessage(instanceName: string, payload: Record<string, unknown>) {
    if (!EVO_URL || !EVO_KEY) return false;

    try {
      const res = await axios.post(`${EVO_URL}/message/sendText/${instanceName}`, payload, {
        headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (err: any) {
      console.error('sendText falhou:', err.response?.data || err.message);
      return false;
    }
  }

  private static formatButtonsAsPlainText(item: OutboundButtons): string {
    const title = (item.title && item.title.trim()) || 'Escolha uma opção';
    const description = item.description?.trim();
    const parts = [title];
    if (description) parts.push(description);
    parts.push('', ...item.buttons.map((b) => `• ${(b.displayText || b.id || 'Opção').trim()}`));
    return parts.join('\n').slice(0, 4096);
  }

  /** Builds body from `item` and sends via sendText (native buttons not used). */
  static async sendButtons(instanceName: string, remoteJid: string, item: OutboundButtons): Promise<boolean> {
    const sent = await this.sendMessage(instanceName, {
      number: remoteJid,
      text: this.formatButtonsAsPlainText(item),
      delay: Math.round(Number(item.delayMs ?? 1200)),
      linkPreview: false,
    });
    return sent !== false;
  }
}
