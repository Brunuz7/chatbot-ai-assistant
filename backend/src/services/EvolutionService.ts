import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { findUserById } from '../authStore.js';
import type { WebhookInboundJob } from '@prisma/client';
import type { FlowProcessResult } from '../types/flowTypes.js';
import { FlowEngineService } from './FlowEngine.js';
import { WebhookQueueWorker } from './WebhookQueueWorker.js';

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

  /** Classificação do payload Evolution (útil para decisões e métricas). */
  private static classifyInboundKind(message: Record<string, unknown> | undefined): string {
    if (!message) return 'upsert.no_message';
    const m = message;
    if (m.buttonsResponseMessage || m.templateButtonReplyMessage || m.listResponseMessage) {
      return 'upsert.interactive';
    }
    if (m.conversation && String(m.conversation as string).trim()) return 'upsert.conversation';
    const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
    if (ext?.text && String(ext.text).trim()) return 'upsert.extended_text';
    if (m.imageMessage || m.videoMessage) return 'upsert.media';
    const speech = m.speechToText as string | undefined;
    if (speech?.trim()) return 'upsert.speech';
    return 'upsert.other';
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
    const event = this.decodeWebhookBody(rawEvent);

    const instanceName =
      typeof event.instance === 'string' && event.instance.trim()
        ? event.instance.trim()
        : '';
    if (!instanceName) {
      return { status: 'invalid', reason: 'no_instance' };
    }

    const ev = this.normalizeWebhookEvent(event.event as string | undefined);

    if (ev !== 'messages.upsert') {
      return { status: 'ignored', reason: ev || String(event.event ?? 'unknown_event') };
    }

    console.log('EVENTO NORMALIZADO:', ev);

    const data = event.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') {
      return { status: 'ignored', reason: 'no_data' };
    }

    const key = data.key as Record<string, unknown> | undefined;
    const message = data.message as Record<string, unknown> | undefined;
    const fromMe = key?.fromMe === true || key?.fromMe === 'true';

    let remoteJid =
      (key?.remoteJidAlt as string) ||
      (key?.remoteJid as string) ||
      '';

    if (remoteJid.includes('@lid') && key?.remoteJidAlt) {
      remoteJid = key.remoteJidAlt as string;
    }

    if (fromMe || !remoteJid) {
      return { status: 'fromMe_ignored' };
    }

    const connection = await prisma.connection.findUnique({
      where: { instance_id: instanceName },
    });

    if (!connection) {
      return { status: 'connection_not_found' };
    }

    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
    let contact = await prisma.userContact.findFirst({
      where: { user_id: connection.user_id, phone_number: cleanPhone },
    });
    if (!contact) {
      contact = await prisma.userContact.create({
        data: {
          user_id: connection.user_id,
          phone_number: cleanPhone,
          whatsapp_id: remoteJid,
        },
      });
      console.log('Novo contato salvo:', cleanPhone);
    }

    const isGroup =
      remoteJid.includes('@g.us') ||
      (key?.remoteJid as string | undefined)?.includes('@g.us');

    const inboundKind = this.classifyInboundKind(message);

    const shouldEnqueue = connection.chatbot_enabled === true && !isGroup;

    if (!shouldEnqueue) {
      if (!connection.chatbot_enabled) {
        console.log('❌ Chatbot desativado — não entra na fila');
        return { status: 'chatbot_disabled' };
      }
      return { status: 'ignored_group' };
    }

    const payload = {
      message: message ?? null,
      webhookEvent: ev || (typeof event.event === 'string' ? event.event : null),
      eventOriginal: typeof event.event === 'string' ? event.event : undefined,
    };

    const job = await prisma.webhookInboundJob.create({
      data: {
        connection_id: connection.id,
        instance_name: instanceName,
        remote_jid: remoteJid,
        event_normalized: ev,
        inbound_kind: inboundKind,
        payload: payload as object,
        status: 'pending',
      },
    });

    WebhookQueueWorker.notifyNewJob();

    return { status: 'queued', jobId: job.id, inboundKind };
  }

  /** Executado pelo worker sobre um registo da fila no banco. */
  static async processInboundJobRow(job: WebhookInboundJob): Promise<void> {
    const payload = job.payload as {
      message?: Record<string, unknown> | null;
      webhookEvent?: string | null;
    };
    const message = payload?.message ?? undefined;
    const webhookEvent = payload?.webhookEvent ?? null;

    const connection = await prisma.connection.findUnique({
      where: { id: job.connection_id },
    });
    if (!connection) {
      throw new Error('connection_not_found');
    }

    if (!connection.chatbot_enabled) {
      console.log('[WebhookJob] chatbot desativado após enfileirar — ignorando');
      return;
    }

    const instanceName = job.instance_name;
    const remoteJid = job.remote_jid;
    const userId = connection.user_id;

    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    let contact = await prisma.userContact.findFirst({
      where: { user_id: userId, phone_number: cleanPhone },
    });
    if (!contact) {
      contact = await prisma.userContact.create({
        data: {
          user_id: userId,
          phone_number: cleanPhone,
          whatsapp_id: remoteJid,
        },
      });
      console.log('Novo contato salvo:', cleanPhone);
    }

    const incomingContent = this.extractInboundText(message) || 'Mídia/Outro';

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
      result = await FlowEngineService.executeInboundFlow({
        userId,
        phoneNumber: remoteJid.split('@')[0] || remoteJid,
        whatsappId: remoteJid,
        incomingText,
        webhookEvent,
      });
    } catch (err: unknown) {
      console.error('FlowEngine.executeInboundFlow falhou:', err instanceof Error ? err.message : err);
      const fallback: FlowProcessResult = {
        outbound: [{ kind: 'text', text: 'Não foi possível processar sua mensagem agora. Tente novamente em instantes.', delayMs: 1200 }],
        flowResume: null,
      };
      result = fallback;
    }

    try {
      const convRow = await prisma.conversation.findUnique({ where: { whatsapp_id: remoteJid }, select: { id: true } });
      if (convRow) {
        await prisma.conversation.update({
          where: { whatsapp_id: remoteJid },
          data:
            result.flowResume === null
              ? { active_flow_id: null, current_step: null }
              : { active_flow_id: result.flowResume.flowId, current_step: result.flowResume.stepKey },
        });
      }
    } catch (persistErr: unknown) {
      console.warn('Erro ao persistir estado do fluxo:', persistErr instanceof Error ? persistErr.message : persistErr);
    }

    const outbound = result.outbound || [];
    console.log("OUTBOUND GERADO:", JSON.stringify(outbound, null, 2));

    for (const item of outbound) {
      await this.sendMessage(instanceName, {
        number: remoteJid,
        text: item.text,
        delay: item.delayMs ?? 1200,
        linkPreview: false,
      });
    }

    const lastPart = outbound[outbound.length - 1];
    const lastText = lastPart?.text ?? '';

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

}
