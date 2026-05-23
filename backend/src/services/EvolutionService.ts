import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { findUserById } from '../authStore.js';
import type { WebhookInboundJob } from '@prisma/client';
import type { FlowProcessResult } from '../types/flowTypes.js';
import {
  buildMessagesUpdate,
  type ConversationMessageEntry,
} from '../lib/conversationMessages.js';
import { withNotDeleted } from '../lib/softDelete.js';
import {
  messageHasAudio,
  normalizeTranscribedSpeech,
  openRouterAudioFormat,
} from '../lib/inboundAudio.js';
import { amplifySpeechMp3 } from '../lib/audioAmplify.js';
import { inboundTrace } from '../lib/inboundTrace.js';
import { shouldReplyWithAudio } from '../lib/ttsReplyPolicy.js';
import { FlowEngineService } from './FlowEngine.js';
import { LeadQualificationService } from './LeadQualificationService.js';
import { hasNewerPendingInboundJob } from '../lib/webhookInboundCoalesce.js';
import { WebhookQueueWorker, type WebhookJobProcessOutcome } from './WebhookQueueWorker.js';
import { MistralVoiceService } from './MistralVoiceService.js';
import { OpenRouterService } from './OpenRouterService.js';
import { UserSettingService } from './UserSettingService.js';

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3001}/api/webhook/evolution`;

export class EvolutionService {
  private static conversationPhone(remoteJid: string): string {
    return remoteJid.split('@')[0] || remoteJid;
  }

  private static normalizeContactPhone(value: string): string {
    const local = value.includes('@') ? value.split('@')[0] : value;
    return local.replace(/\D/g, '');
  }

  private static async resolveContactId(
    userId: string,
    whatsappId: string,
    phoneNumber?: string,
  ): Promise<string> {
    const cleanPhone = this.normalizeContactPhone(phoneNumber ?? this.conversationPhone(whatsappId));

    let contact = await prisma.userContact.findFirst({
      where: withNotDeleted({
        user_id: userId,
        OR: [{ whatsapp_id: whatsappId }, { phone_number: cleanPhone }],
      }),
      select: { id: true, whatsapp_id: true },
    });

    if (!contact) {
      contact = await prisma.userContact.create({
        data: { user_id: userId, phone_number: cleanPhone, whatsapp_id: whatsappId },
        select: { id: true, whatsapp_id: true },
      });
    } else if (!contact.whatsapp_id) {
      await prisma.userContact.update({
        where: { id: contact.id },
        data: { whatsapp_id: whatsappId },
      });
    }

    return contact.id;
  }

  private static async appendConversationMessage(
    userId: string,
    whatsappId: string,
    contactId: string,
    entry: ConversationMessageEntry,
  ): Promise<void> {
    const existing = await prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
      select: { id: true, messages: true, contact_id: true },
    });

    if (existing) {
      const patch = buildMessagesUpdate(existing.messages, entry);
      await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          contact_id: existing.contact_id ?? contactId,
          messages: patch.messages as any,
          message_count: patch.message_count,
          last_message_at: patch.last_message_at,
          last_message_direction: patch.last_message_direction,
          last_message_preview: patch.last_message_preview,
        },
      });
      return;
    }

    const patch = buildMessagesUpdate([], entry);
    await prisma.conversation.create({
      data: {
        user_id: userId,
        contact_id: contactId,
        phone_number: this.conversationPhone(whatsappId),
        whatsapp_id: whatsappId,
        messages: patch.messages as any,
        message_count: patch.message_count,
        last_message_at: patch.last_message_at,
        last_message_direction: patch.last_message_direction,
        last_message_preview: patch.last_message_preview,
      },
    });
  }

  private static async findConversationForUser(userId: string, whatsappId: string) {
    return prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
    });
  }

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
    if (speech && speech.trim()) return normalizeTranscribedSpeech(speech);

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
    if (messageHasAudio(m)) return 'upsert.audio';
    const speech = m.speechToText as string | undefined;
    if (speech?.trim()) return 'upsert.speech';
    return 'upsert.other';
  }

  private static readAudioBase64FromPayload(
    innerMessage: Record<string, unknown> | undefined | null,
    webhookMessage: Record<string, unknown> | undefined | null,
  ): { base64: string; mimetype?: string; fileName?: string } | null {
    const candidates: unknown[] = [
      innerMessage?.base64,
      (innerMessage?.audioMessage as Record<string, unknown> | undefined)?.base64,
      webhookMessage?.base64,
      (webhookMessage?.message as Record<string, unknown> | undefined)?.base64,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        const audioMsg =
          (innerMessage?.audioMessage as Record<string, unknown> | undefined) ||
          ((webhookMessage?.message as Record<string, unknown> | undefined)?.audioMessage as
            | Record<string, unknown>
            | undefined);
        const mimetype =
          (audioMsg?.mimetype as string | undefined) ||
          (webhookMessage?.mimetype as string | undefined);
        const fileName = audioMsg?.fileName as string | undefined;
        return { base64: value.trim(), mimetype, fileName };
      }
    }

    return null;
  }

  private static async fetchAudioBase64FromEvolution(
    instanceName: string,
    webhookMessage: Record<string, unknown>,
  ): Promise<{ base64: string; mimetype?: string; fileName?: string } | null> {
    if (!EVO_URL || !EVO_KEY) return null;

    try {
      const res = await axios.post(
        `${EVO_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
        { message: webhookMessage, convertToMp4: false },
        { headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' }, timeout: 90_000 },
      );

      const base64 = res.data?.base64;
      if (typeof base64 !== 'string' || !base64.trim()) return null;

      return {
        base64: base64.trim(),
        mimetype: res.data?.mimetype as string | undefined,
        fileName: res.data?.fileName as string | undefined,
      };
    } catch (err: unknown) {
      console.warn(
        'getBase64FromMediaMessage falhou:',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private static async transcribeInboundAudio(
    instanceName: string,
    innerMessage: Record<string, unknown> | undefined | null,
    webhookMessage: Record<string, unknown> | undefined | null,
  ): Promise<string | null> {
    let media =
      this.readAudioBase64FromPayload(innerMessage, webhookMessage) ||
      (webhookMessage ? await this.fetchAudioBase64FromEvolution(instanceName, webhookMessage) : null);

    if (!media?.base64) return null;

    const format = openRouterAudioFormat(media.mimetype, media.fileName);
    return OpenRouterService.transcribeAudio({ base64: media.base64, format });
  }

  /** Texto utilizável para fluxo/IA: texto normal, speechToText Evolution ou STT OpenRouter. */
  private static async resolveInboundText(
    instanceName: string,
    innerMessage: Record<string, unknown> | undefined | null,
    webhookMessage: Record<string, unknown> | undefined | null,
  ): Promise<string> {
    const direct = normalizeTranscribedSpeech(this.extractInboundText(innerMessage));
    if (direct) return direct;

    if (!messageHasAudio(innerMessage)) return '';

    try {
      const transcript = await this.transcribeInboundAudio(instanceName, innerMessage, webhookMessage);
      return normalizeTranscribedSpeech(transcript || '');
    } catch (err: unknown) {
      console.warn(
        'STT OpenRouter indisponível para mensagem de áudio:',
        err instanceof Error ? err.message : err,
      );
      return '';
    }
  }

  private static formatInboundContentForHistory(text: string, wasAudio: boolean): string {
    const trimmed = text.trim();
    if (!trimmed) return wasAudio ? '[áudio sem transcrição]' : '(mensagem vazia)';
    if (wasAudio) return `[áudio] ${trimmed}`;
    return trimmed;
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
        { enabled: true, url: WEBHOOK_URL, byEvents: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
        { headers: { apikey: EVO_KEY } },
      );
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
      const stateResponse = await axios
        .get(`${EVO_URL}/instance/connectionState/${instanceName}`, { headers: { apikey: EVO_KEY } });

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
          webhook: { enabled: true, url: WEBHOOK_URL, byEvents: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
        },
        { headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' } },
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const connectResponse = await axios.get(`${EVO_URL}/instance/connect/${instanceName}`, { headers: { apikey: EVO_KEY } });
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

    return { connectionStatus, instanceName, chatbotEnabled: connection.chatbot_enabled || false };
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

  /** Executado pelo worker sobre um registo da fila no banco. */
  static async processInboundJobRow(job: WebhookInboundJob): Promise<WebhookJobProcessOutcome> {
    const skipIfSuperseded = () =>
      hasNewerPendingInboundJob({
        connectionId: job.connection_id,
        remoteJid: job.remote_jid,
        createdAt: job.created_at,
      });

    if (await skipIfSuperseded()) {
      inboundTrace('job.superseded.inicio', { jobId: job.id, remoteJid: job.remote_jid });
      return 'superseded';
    }

    inboundTrace('job.inicio', {
      jobId: job.id,
      remoteJid: job.remote_jid,
      inboundKind: job.inbound_kind,
      instance: job.instance_name,
    });

    const payload = job.payload as {
      message?: Record<string, unknown> | null;
      webhookMessage?: Record<string, unknown> | null;
      webhookEvent?: string | null;
    };
    const message = payload?.message ?? undefined;
    const webhookMessage = payload?.webhookMessage ?? undefined;
    const webhookEvent = payload?.webhookEvent ?? null;
    const connection = await prisma.connection.findUnique({ where: { id: job.connection_id } });
    
    if (!connection) throw new Error('connection_not_found');
    if (!connection.chatbot_enabled) {
      inboundTrace('job.chatbot_desligado', { jobId: job.id });
      return 'processed';
    }

    const { instance_name: instanceName, remote_jid: remoteJid } = job;
    const userId = connection.user_id;
    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    const contactId = await this.resolveContactId(userId, remoteJid, cleanPhone);

    const hadAudio =
      messageHasAudio(message) ||
      job.inbound_kind === 'upsert.audio' ||
      job.inbound_kind === 'upsert.speech';
    const resolvedText = (await this.resolveInboundText(instanceName, message, webhookMessage)).trim();

    let incomingContent: string;
    let flowInput: string;

    if (resolvedText) {
      incomingContent = this.formatInboundContentForHistory(resolvedText, hadAudio);
      flowInput = resolvedText;
    } else if (hadAudio) {
      incomingContent = '[áudio sem transcrição]';
      flowInput =
        'O cliente enviou uma mensagem de áudio que não foi possível transcrever. Peça educadamente para repetir ou escrever.';
    } else {
      incomingContent = this.extractInboundText(message) || 'Mídia/Outro';
      flowInput = incomingContent === 'Mídia/Outro' ? '(mensagem vazia)' : incomingContent;
    }

    inboundTrace('job.texto_resolvido', {
      jobId: job.id,
      hadAudio,
      flowInputPreview: flowInput.slice(0, 100),
    });

    try {
      await this.appendConversationMessage(userId, remoteJid, contactId, {
        direction: 'in',
        content: incomingContent,
        timestamp: new Date().toISOString(),
      });
    } catch (convErr: unknown) {
      console.warn(
        'Erro ao registar conversa:',
        convErr instanceof Error ? convErr.message : convErr,
      );
    }

    let result: FlowProcessResult;
    try {
      result = await FlowEngineService.executeInboundFlow({
        userId,
        phoneNumber: remoteJid.split('@')[0] || remoteJid,
        whatsappId: remoteJid,
        incomingText: flowInput,
        webhookEvent,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('FlowEngine.executeInboundFlow falhou:', msg);
      inboundTrace('flow.erro', { jobId: job.id, error: msg });
      result = { outbound: [{ kind: 'text', text: 'Não foi possível processar sua mensagem agora. Tente novamente em instantes.', delayMs: 1200 }],
        flowResume: null,
      };
    }

    if (await skipIfSuperseded()) {
      inboundTrace('job.superseded.pos_fluxo', { jobId: job.id });
      return 'superseded';
    }

    try {
      const convRow = await this.findConversationForUser(userId, remoteJid);
      if (convRow) {
        await prisma.conversation.update({
          where: { id: convRow.id },
          data:
            result.flowResume === null
              ? { active_flow_id: null }
              : { active_flow_id: result.flowResume.flowId },
        });
      }
    } catch (persistErr: unknown) {
      console.warn('Erro ao persistir estado do fluxo:', persistErr instanceof Error ? persistErr.message : persistErr);
    }

    const outbound = result.outbound || [];
    const reply = outbound.length > 0 ? outbound[outbound.length - 1] : null;

    inboundTrace('job.outbound', {
      jobId: job.id,
      count: outbound.length,
      hasReply: !!reply?.text?.trim(),
      replyPreview: reply?.text?.slice(0, 80) ?? null,
    });

    if (reply?.text?.trim()) {
      if (await skipIfSuperseded()) {
        inboundTrace('job.superseded.antes_envio', { jobId: job.id, remoteJid });
        return 'superseded';
      }

      const delayMs = reply.delayMs ?? 1200;
      const channel = await this.deliverOutboundReply({
        instanceName,
        remoteJid,
        replyText: reply.text.trim(),
        delayMs,
        userId,
        contactSentAudio: hadAudio,
        forceAudio: reply.forceAudio === true,
      });

      inboundTrace('job.entregue', {
        jobId: job.id,
        channel,
        number: this.evolutionRecipientNumber(remoteJid),
      });

      if (channel === 'none') {
        inboundTrace('job.entrega_falhou', {
          jobId: job.id,
          instanceName,
          remoteJid,
          preview: reply.text.slice(0, 80),
        });
      }

      const outPreview =
        channel === 'audio' ? `[voz] ${reply.text}` : reply.text;

      try {
        await this.appendConversationMessage(userId, remoteJid, contactId, {
          direction: 'out',
          content: outPreview,
          timestamp: new Date().toISOString(),
        });
      } catch (convErr: unknown) {
        console.warn(
          'Erro ao registar mensagem de saída:',
          convErr instanceof Error ? convErr.message : convErr,
        );
      }
    } else {
      inboundTrace('job.sem_resposta', {
        jobId: job.id,
        remoteJid,
        userId,
        preview: flowInput.slice(0, 80),
      });
    }

    inboundTrace('job.fim', { jobId: job.id, status: 'processed' });

    try {
      await LeadQualificationService.qualifyContactFromConversation({
        userId,
        contactId,
        whatsappId: remoteJid,
        incomingText: flowInput,
      });
    } catch (qualErr: unknown) {
      console.warn(
        'Erro na qualificação de lead:',
        qualErr instanceof Error ? qualErr.message : qualErr,
      );
    }

    return 'processed';
  }

  static async sendMessage(instanceName: string, payload: Record<string, unknown>) {
    if (!EVO_URL || !EVO_KEY) {
      inboundTrace('evo.sendText.skip', { reason: 'EVOLUTION_API_URL ou KEY ausente' });
      return false;
    }

    try {
      inboundTrace('evo.sendText', {
        instanceName,
        number: payload.number,
        textLen: String(payload.text ?? '').length,
      });
      const res = await axios.post(`${EVO_URL}/message/sendText/${instanceName}`, payload, {
        headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
      });
      inboundTrace('evo.sendText.ok', {
        instanceName,
        status: res.status,
        messageId: (res.data as { key?: { id?: string } })?.key?.id ?? null,
      });
      return res.data;
    } catch (err: any) {
      inboundTrace('evo.sendText.erro', {
        instanceName,
        data: err.response?.data ?? err.message,
      });
      return false;
    }
  }

  /** Número/jid aceite pela Evolution (`sendText` / `sendWhatsAppAudio`). */
  private static evolutionRecipientNumber(remoteJid: string): string {
    return this.conversationPhone(remoteJid);
  }

  static async sendAudio(
    instanceName: string,
    payload: { number: string; audio: string; delay?: number; encoding?: boolean },
  ): Promise<boolean> {
    if (!EVO_URL || !EVO_KEY) {
      inboundTrace('evo.sendAudio.skip', { reason: 'EVOLUTION_API_URL ou KEY ausente' });
      return false;
    }

    const body = {
      number: payload.number,
      audio: payload.audio,
      encoding: payload.encoding !== false,
      delay: payload.delay ?? 1200,
    };

    try {
      inboundTrace('evo.sendAudio', {
        instanceName,
        number: payload.number,
        encoding: body.encoding,
        base64Len: payload.audio.length,
      });
      const res = await axios.post(`${EVO_URL}/message/sendWhatsAppAudio/${instanceName}`, body, {
        headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
        timeout: 90_000,
      });
      inboundTrace('evo.sendAudio.ok', {
        instanceName,
        status: res.status,
        messageId: (res.data as { key?: { id?: string } })?.key?.id ?? null,
      });
      return true;
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      inboundTrace('evo.sendAudio.erro', {
        instanceName,
        encoding: body.encoding,
        status: anyErr.response?.status,
        data: anyErr.response?.data ?? anyErr.message,
      });
      return false;
    }
  }

  /** Tenta áudio (se política TTS); caso falhe ou não aplique, envia texto. */
  private static async deliverOutboundReply(params: {
    instanceName: string;
    remoteJid: string;
    replyText: string;
    delayMs: number;
    userId: string;
    contactSentAudio: boolean;
    forceAudio?: boolean;
  }): Promise<'audio' | 'text' | 'none'> {
    const number = this.evolutionRecipientNumber(params.remoteJid);
    inboundTrace('entrega.inicio', {
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      number,
      contactSentAudio: params.contactSentAudio,
      textLen: params.replyText.length,
    });
    const channel = await this.trySendAudioReply({
      instanceName: params.instanceName,
      number,
      replyText: params.replyText,
      delayMs: params.delayMs,
      userId: params.userId,
      contactSentAudio: params.contactSentAudio,
      forceAudio: params.forceAudio === true,
    });

    if (channel === 'audio') {
      inboundTrace('entrega.audio_ok', { number });
      return 'audio';
    }

    inboundTrace('entrega.tentar_texto', { motivo: channel === 'text' ? 'tts_desactivado_ou_fallback' : channel });
    const textSent = await this.sendMessage(params.instanceName, {
      number,
      text: params.replyText,
      delay: params.delayMs,
      linkPreview: false,
    });

    if (!textSent) return 'none';
    return 'text';
  }

  private static clampTtsText(text: string, maxChars: number): string {
    const t = text.trim();
    if (t.length <= maxChars) return t;
    return `${t.slice(0, maxChars).trim()}…`;
  }

  private static async trySendAudioReply(params: {
    instanceName: string;
    number: string;
    replyText: string;
    delayMs: number;
    userId: string;
    contactSentAudio: boolean;
    forceAudio?: boolean;
  }): Promise<'audio' | 'text'> {
    let tts;
    try {
      tts = await UserSettingService.getTtsReplySettings(params.userId);
      inboundTrace('tts.config', {
        enabled: tts.tts_reply_enabled,
        mode: tts.tts_reply_mode,
        voiceType: tts.tts_voice_type,
        hasClone: !!tts.mistral_voice_id,
        model: tts.tts_model,
        maxChars: tts.tts_max_chars,
      });
    } catch (err: unknown) {
      inboundTrace('tts.config.erro', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 'text';
    }

    const audioPolicy = shouldReplyWithAudio({
      enabled: tts.tts_reply_enabled,
      mode: tts.tts_reply_mode,
      contactSentAudio: params.contactSentAudio,
      force: params.forceAudio === true,
    });
    if (!audioPolicy) {
      inboundTrace('tts.politica.texto', {
        enabled: tts.tts_reply_enabled,
        mode: tts.tts_reply_mode,
        contactSentAudio: params.contactSentAudio,
        forceAudio: params.forceAudio === true,
      });
      return 'text';
    }

    const speechText = this.clampTtsText(params.replyText, tts.tts_max_chars);
    if (!speechText) {
      inboundTrace('tts.texto_vazio');
      return 'text';
    }

    try {
      let audioBuffer: Buffer;
      const useClone = tts.tts_voice_type === 'clone' && !!tts.mistral_voice_id;

      inboundTrace('tts.sintese.inicio', {
        provider: useClone ? 'mistral' : 'openrouter',
        speechChars: speechText.length,
      });

      if (useClone) {
        audioBuffer = await MistralVoiceService.synthesizeWithClonedVoice({
          text: speechText,
          voiceId: tts.mistral_voice_id!,
        });
      } else {
        audioBuffer = await OpenRouterService.synthesizeSpeech({
          text: speechText,
          voice: tts.tts_voice,
          model: tts.tts_model,
        });
      }

      inboundTrace('tts.sintese.ok', { bytes: audioBuffer.length });

      audioBuffer = await amplifySpeechMp3(audioBuffer);

      let sent = await this.sendAudio(params.instanceName, {
        number: params.number,
        audio: audioBuffer.toString('base64'),
        delay: params.delayMs,
        encoding: true,
      });
      if (!sent) {
        inboundTrace('tts.envio.retry_sem_encoding');
        sent = await this.sendAudio(params.instanceName, {
          number: params.number,
          audio: audioBuffer.toString('base64'),
          delay: params.delayMs,
          encoding: false,
        });
      }
      inboundTrace('tts.envio.resultado', { sent });
      return sent ? 'audio' : 'text';
    } catch (err: unknown) {
      inboundTrace('tts.erro', {
        error: err instanceof Error ? err.message : String(err),
      });
      return 'text';
    }
  }

  /** `messages.upsert`: sincroniza contacto, bloqueios, enfileira job. */
  private static async processReceivedMessageUpsert(
    decodedEvent: Record<string, unknown>,
    instanceName: string,
    normalizedEvent: string,
    data: Record<string, unknown>,
  ) {
    const key = data.key as Record<string, unknown> | undefined;
    const message = data.message as Record<string, unknown> | undefined;
    const fromMe = key?.fromMe === true || key?.fromMe === 'true';
    let remoteJid = (key?.remoteJidAlt as string) || (key?.remoteJid as string) || '';
    if (remoteJid.includes('@lid') && key?.remoteJidAlt) remoteJid = key.remoteJidAlt as string;
    if (fromMe || !remoteJid) return { status: 'fromMe_ignored' as const };

    const connection = await prisma.connection.findUnique({ where: { instance_id: instanceName } });
    if (!connection) return { status: 'connection_not_found' as const };

    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
    let contact = await prisma.userContact.findFirst({ where: { user_id: connection.user_id, phone_number: cleanPhone } });

    let contactName: string | null =
      (data?.pushName as string) ||
      (data?.notifyName as string) ||
      (data?.senderPushName as string) ||
      (data?.verifiedBizName as string) ||
      null;

    if (!contactName && message) {
      const extended = message.extendedTextMessage as any;
      const ctx = extended?.contextInfo;
      contactName = ctx?.participantName || ctx?.quotedMessage?.pushName || null;
    }

    if (!contactName) {
      try {
        const response = await axios.get(`${EVO_URL}/chat/findContacts/${instanceName}`, { headers: { apikey: EVO_KEY || '' } });
        const contacts = response.data?.contacts || [];
        const foundContact = contacts.find((c: any) => c.id === remoteJid || c.remoteJid === remoteJid || c.number === cleanPhone,
        );
        if (foundContact) {
          contactName = foundContact.pushName || foundContact.profileName || foundContact.name || foundContact.notify || null;
        }
      } catch (error) {
        console.log('Erro ao buscar nome:', error);
      }
    }

    if (!contactName && contact?.name) contactName = contact.name;
    if (!contactName) contactName = 'Sem nome';

    if (!contact) {
      contact = await prisma.userContact.create({ data: { user_id: connection.user_id, phone_number: cleanPhone, whatsapp_id: remoteJid, name: contactName } });
    } else {
      await prisma.userContact.update({ where: { id: contact.id }, data: { name: contactName || contact.name } });
    }

    if (contact.blocked && contact.blocked_until && new Date(contact.blocked_until) <= new Date()) {
      contact = await prisma.userContact.update({
        where: { id: contact.id },
        data: { blocked: false, blocked_at: null, blocked_until: null, block_reason: null },
      });
    }

    if (contact.blocked_until && new Date(contact.blocked_until) > new Date()) {
      return { status: 'temporarily_blocked' as const, phone: cleanPhone };
    }
    if (contact.blocked) return { status: 'contact_blocked' as const, phone: cleanPhone };

    const isGroup = remoteJid.includes('@g.us') || (key?.remoteJid as string | undefined)?.includes('@g.us');
    const inboundKind = this.classifyInboundKind(message);
    const shouldEnqueue = connection.chatbot_enabled === true && !isGroup;

    if (!shouldEnqueue) {
      if (!connection.chatbot_enabled) return { status: 'chatbot_disabled' as const };
      return { status: 'ignored_group' as const };
    }

    const jobPayload = {
      message: message ?? null,
      webhookMessage: data,
      webhookEvent: normalizedEvent || (typeof decodedEvent.event === 'string' ? decodedEvent.event : null),
      eventOriginal: typeof decodedEvent.event === 'string' ? decodedEvent.event : undefined,
    };

    const job = await prisma.webhookInboundJob.create({
      data: {
        connection_id: connection.id,
        instance_name: instanceName,
        remote_jid: remoteJid,
        event_normalized: normalizedEvent,
        inbound_kind: inboundKind,
        payload: jobPayload as object,
        status: 'pending',
      },
    });

    inboundTrace('webhook.enfileirado', {
      jobId: job.id,
      instanceName,
      remoteJid,
      inboundKind,
    });
    WebhookQueueWorker.notifyNewJob();
    return { status: 'queued' as const, jobId: job.id, inboundKind };
  }

  static async handleWebhook(rawEvent: Record<string, unknown>) {
    const decodedEvent = this.decodeWebhookBody(rawEvent);
    const inst = decodedEvent.instance;
    const instanceName = typeof inst === 'string' && inst.trim() ? inst.trim() : '';
    if (!instanceName) return { status: 'invalid', reason: 'no_instance' };

    const normalizedEvent = this.normalizeWebhookEvent(decodedEvent.event as string | undefined);

    switch (normalizedEvent) {
      case 'messages.upsert':
        break;

      case 'connection.update':
      case 'qrcode.updated':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      case 'chats.upsert':
      case 'chats.update':
      case 'chats.delete':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      case 'messages.update':
      case 'messages.delete':
      case 'send.message':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      case 'contacts.upsert':
      case 'contacts.update':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      case 'presence.update':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      case 'groups.upsert':
      case 'groups.update':
      case 'group.participants.update':
      case 'groups.participants.update':
        return { status: 'ignored', reason: `${normalizedEvent}_not_handled` };

      default:
        return { status: 'ignored', reason: normalizedEvent || String(decodedEvent.event ?? 'unknown_event') };
    }

    const data = decodedEvent.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return { status: 'ignored', reason: 'no_data' };

    return this.processReceivedMessageUpsert(decodedEvent, instanceName, normalizedEvent, data);
  }
}
