import axios from 'axios';
import type { Connection, UserContact, WebhookInboundJob } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
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
import {
  classifyMetaInboundKind,
  extractMetaInboundText,
  metaToRemoteJid,
  normalizeMetaMessageForJob,
} from '../lib/metaInboundMessage.js';
import { parseWhatsappChannel } from '../lib/whatsappChannel.js';
import { hasNewerPendingInboundJob } from '../lib/webhookInboundCoalesce.js';

export type WebhookJobProcessOutcome = 'processed' | 'superseded';
import { MistralVoiceService } from './MistralVoiceService.js';
import { OpenRouterService } from './OpenRouterService.js';
import { FlowEngineService } from './FlowService.js';
import { TagService } from './TagService.js';
import { ConnectionService } from './ConnectionService.js';
import { UserSettingService } from './UserSettingService.js';

const OFFICIAL_TYPE = 'WHATSAPP_OFFICIAL';
const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

function metaVerifyToken(): string {
  return (process.env.META_WEBHOOK_VERIFY_TOKEN || '').trim();
}

type EnqueueInboundParams = {
  connection: Connection;
  instanceName: string;
  remoteJid: string;
  eventNormalized: string;
  inboundKind: string;
  payload: Record<string, unknown>;
  traceLabel: 'evolution' | 'meta';
};

export class WebhookService {
static extractMetaInboundText = extractMetaInboundText;

  static officialPublicUrl(): string | null {
    const webhookUrl = process.env.WEBHOOK_URL?.trim();
    if (webhookUrl) {
      return webhookUrl.replace(/\/webhook\/[^/]+\/?$/i, '/webhook/whatsapp-official');
    }
    const base = process.env.PUBLIC_API_URL?.trim();
    if (base) return `${base.replace(/\/$/, '')}/api/webhook/whatsapp-official`;
    return null;
  }

  static verifyOfficialSubscription(
    query: Record<string, unknown>,
  ): { ok: true; challenge: string } | { ok: false; reason: string } {
    const mode = String(query['hub.mode'] ?? '');
    const token = String(query['hub.verify_token'] ?? '').trim();
    const challenge = String(query['hub.challenge'] ?? '');
    const expected = metaVerifyToken();

    if (!mode && !token && !challenge) {
      return { ok: false, reason: 'missing_hub_params' };
    }
    if (!expected) {
      return { ok: false, reason: 'meta_verify_token_not_configured' };
    }
    if (mode !== 'subscribe') {
      return { ok: false, reason: 'invalid_hub_mode' };
    }
    if (!token || token !== expected) {
      return { ok: false, reason: 'verify_token_mismatch' };
    }
    if (!challenge) {
      return { ok: false, reason: 'missing_challenge' };
    }

    return { ok: true, challenge };
  }

  /** Webhook Meta Cloud API (POST). */
  static async handleOfficial(body: Record<string, unknown>) {
    if (body.object !== 'whatsapp_business_account') {
      return { status: 'ignored', reason: 'not_whatsapp_business_account' };
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const results: unknown[] = [];

    for (const entry of entries) {
      const entryObj = entry as Record<string, unknown>;
      const rawChanges = entryObj.changes;
      const changes = Array.isArray(rawChanges) ? rawChanges : [];

      for (const change of changes) {
        const changeObj = change as Record<string, unknown>;
        const field = String(changeObj.field ?? '');

        if (field === 'messages') {
          results.push(await this.processOfficialMessagesChange(changeObj.value as Record<string, unknown>));
        } else {
          results.push({ status: 'ignored', reason: field || 'unknown_field' });
        }
      }
    }

    return { status: 'ok', results };
  }

  /** Webhook Evolution API (POST). */
  private static async processOfficialMessagesChange(value: Record<string, unknown> | undefined) {
    if (!value || typeof value !== 'object') {
      return { status: 'ignored', reason: 'no_value' };
    }

    const phoneNumberId = (value.metadata as Record<string, unknown> | undefined)?.phone_number_id;
    if (!phoneNumberId || typeof phoneNumberId !== 'string') {
      return { status: 'ignored', reason: 'no_phone_number_id' };
    }

    const connection = await prisma.connection.findFirst({
      where: {
        type: OFFICIAL_TYPE,
        OR: [{ phone_number_id: phoneNumberId }, { instance_id: phoneNumberId }],
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      inboundTrace('webhook.meta.connection_not_found', { phoneNumberId });
      return { status: 'connection_not_found', phoneNumberId };
    }

    const settings = await UserSettingService.getOrCreate(connection.user_id);
    if (parseWhatsappChannel(settings.whatsapp_channel) !== 'official') {
      return { status: 'channel_not_active', phoneNumberId };
    }

    const messages = Array.isArray(value.messages) ? value.messages : [];
    const contacts = Array.isArray(value.contacts) ? value.contacts : [];

    if (messages.length === 0) {
      return { status: 'ignored', reason: 'status_only_or_empty' };
    }

    if (!connection.chatbot_enabled) {
      return { status: 'chatbot_disabled', phoneNumberId };
    }

    const queued: string[] = [];

    for (const raw of messages) {
      const metaMessage = raw as Record<string, unknown>;
      const from = String(metaMessage.from ?? '');
      if (!from) continue;

      const remoteJid = metaToRemoteJid(from);
      const cleanPhone = from.replace(/\D/g, '');

      const contactMeta = contacts.find(
        (c) => String((c as Record<string, unknown>).wa_id ?? '') === from,
      ) as Record<string, unknown> | undefined;
      const contactName =
        (contactMeta?.profile as Record<string, unknown> | undefined)?.name?.toString() ||
        'Sem nome';

      const sync = await WebhookService.syncContactForInbound({
        userId: connection.user_id,
        cleanPhone,
        remoteJid,
        contactName,
      });

      if (sync.blocked) continue;

      const job = await WebhookService.enqueueInboundJob({
        connection,
        instanceName: phoneNumberId,
        remoteJid,
        eventNormalized: 'messages',
        inboundKind: classifyMetaInboundKind(metaMessage),
        payload: {
          source: 'meta_cloud',
          message: normalizeMetaMessageForJob(metaMessage),
          webhookMessage: value,
          metaMessage,
          webhookEvent: 'messages',
        },
        traceLabel: 'meta',
      });

      queued.push(job.id);
    }

    return { status: queued.length > 0 ? 'queued' : 'ignored', jobIds: queued, phoneNumberId };
  }

  /** Nome do contacto a partir do payload Evolution (com fallback à API). */
  static async resolveEvolutionContactName(
    instanceName: string,
    remoteJid: string,
    cleanPhone: string,
    data: Record<string, unknown>,
    message: Record<string, unknown> | undefined,
    existingName?: string | null,
  ): Promise<string> {
    let contactName: string | null =
      (data.pushName as string) ||
      (data.notifyName as string) ||
      (data.senderPushName as string) ||
      (data.verifiedBizName as string) ||
      null;

    if (!contactName && message) {
      const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
      const ctx = extended?.contextInfo as Record<string, unknown> | undefined;
      contactName =
        (ctx?.participantName as string) ||
        ((ctx?.quotedMessage as Record<string, unknown> | undefined)?.pushName as string) ||
        null;
    }

    if (!contactName && EVO_URL && EVO_KEY) {
      try {
        const response = await axios.get(`${EVO_URL}/chat/findContacts/${instanceName}`, {
          headers: { apikey: EVO_KEY },
        });
        const list = (response.data as { contacts?: Record<string, unknown>[] })?.contacts || [];
        const found = list.find(
          (c) => c.id === remoteJid || c.remoteJid === remoteJid || c.number === cleanPhone,
        );
        if (found) {
          contactName =
            (found.pushName as string) ||
            (found.profileName as string) ||
            (found.name as string) ||
            (found.notify as string) ||
            null;
        }
      } catch {
        /* opcional */
      }
    }

    return contactName || existingName || 'Sem nome';
  }

  static async handleEvolution(rawEvent: Record<string, unknown>) {
    return WebhookService.handleEvolutionWebhookEvent(rawEvent);
  }

  static async syncContactForInbound(params: {
    userId: string;
    cleanPhone: string;
    remoteJid: string;
    contactName: string;
  }): Promise<{ contact: UserContact; blocked: false } | { blocked: true; reason: string }> {
    let contact = await prisma.userContact.findFirst({
      where: { user_id: params.userId, phone_number: params.cleanPhone },
    });

    if (!contact) {
      contact = await prisma.userContact.create({
        data: {
          user_id: params.userId,
          phone_number: params.cleanPhone,
          whatsapp_id: params.remoteJid,
          name: params.contactName,
        },
      });
    } else {
      await prisma.userContact.update({
        where: { id: contact.id },
        data: {
          name: params.contactName || contact.name,
          whatsapp_id: params.remoteJid,
        },
      });
    }

    if (contact.blocked && contact.blocked_until && new Date(contact.blocked_until) <= new Date()) {
      contact = await prisma.userContact.update({
        where: { id: contact.id },
        data: { blocked: false, blocked_at: null, blocked_until: null, block_reason: null },
      });
    }

    if (contact.blocked_until && new Date(contact.blocked_until) > new Date()) {
      return { blocked: true, reason: 'temporarily_blocked' };
    }
    if (contact.blocked) {
      return { blocked: true, reason: 'contact_blocked' };
    }

    return { contact, blocked: false };
  }

  static async enqueueInboundJob(params: EnqueueInboundParams) {
    const job = await prisma.webhookInboundJob.create({
      data: {
        connection_id: params.connection.id,
        instance_name: params.instanceName,
        remote_jid: params.remoteJid,
        event_normalized: params.eventNormalized,
        inbound_kind: params.inboundKind,
        payload: params.payload as object,
        status: 'pending',
      },
    });
  
    inboundTrace(`webhook.${params.traceLabel}.enfileirado`, {
      jobId: job.id,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      inboundKind: params.inboundKind,
    });
  
    WebhookService.notifyInboundJob();
    return job;
  }

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
      source?: string;
      message?: Record<string, unknown> | null;
      webhookMessage?: Record<string, unknown> | null;
      metaMessage?: Record<string, unknown> | null;
      webhookEvent?: string | null;
    };
    const isMetaCloud = payload?.source === 'meta_cloud';
    const message = payload?.message ?? undefined;
    const webhookMessage = payload?.webhookMessage ?? undefined;
    const metaMessage = payload?.metaMessage ?? undefined;
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

    const hadAudio = isMetaCloud
      ? job.inbound_kind === 'meta.audio'
      : messageHasAudio(message) ||
        job.inbound_kind === 'upsert.audio' ||
        job.inbound_kind === 'upsert.speech';
    const resolvedText = isMetaCloud
      ? extractMetaInboundText(metaMessage, message).trim()
      : (await this.resolveInboundText(instanceName, message, webhookMessage)).trim();

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
      await TagService.qualifyContactFromConversation({
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

  private static evolutionRecipientNumber(remoteJid: string): string {
    return this.conversationPhone(remoteJid);
  }

  private static async deliverOutboundReply(params: {
    instanceName: string;
    remoteJid: string;
    replyText: string;
    delayMs: number;
    userId: string;
    contactSentAudio: boolean;
    forceAudio?: boolean;
  }): Promise<'audio' | 'text' | 'none'> {
    const connection = await prisma.connection.findUnique({
      where: { instance_id: params.instanceName },
    });

    if (connection?.type === 'WHATSAPP_OFFICIAL') {
      inboundTrace('entrega.meta_oficial', {
        phoneNumberId: params.instanceName,
        remoteJid: params.remoteJid,
        textLen: params.replyText.length,
      });
      if (params.delayMs > 0) {
        await new Promise((r) => setTimeout(r, Math.min(params.delayMs, 5000)));
      }
      return ConnectionService.deliverOfficialReply(
        connection,
        params.remoteJid,
        params.replyText,
      );
    }

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
    const textSent = await ConnectionService.sendEvolutionMessage(params.instanceName, {
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
      force: params.forceAudio === true,
    });
    if (!audioPolicy) {
      inboundTrace('tts.politica.texto', {
        enabled: tts.tts_reply_enabled,
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

      let sent = await ConnectionService.sendEvolutionAudio(params.instanceName, {
        number: params.number,
        audio: audioBuffer.toString('base64'),
        delay: params.delayMs,
        encoding: true,
      });
      if (!sent) {
        inboundTrace('tts.envio.retry_sem_encoding');
        sent = await ConnectionService.sendEvolutionAudio(params.instanceName, {
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

    const existing = await prisma.userContact.findFirst({
      where: { user_id: connection.user_id, phone_number: cleanPhone },
    });

    const contactName = await WebhookService.resolveEvolutionContactName(
      instanceName,
      remoteJid,
      cleanPhone,
      data,
      message,
      existing?.name,
    );

    const sync = await WebhookService.syncContactForInbound({
      userId: connection.user_id,
      cleanPhone,
      remoteJid,
      contactName,
    });

    if (sync.blocked) {
      return { status: sync.reason as 'temporarily_blocked' | 'contact_blocked', phone: cleanPhone };
    }

    const isGroup = remoteJid.includes('@g.us') || (key?.remoteJid as string | undefined)?.includes('@g.us');
    const inboundKind = this.classifyInboundKind(message);
    const shouldEnqueue = connection.chatbot_enabled === true && !isGroup;

    if (!shouldEnqueue) {
      if (!connection.chatbot_enabled) return { status: 'chatbot_disabled' as const };
      return { status: 'ignored_group' as const };
    }

    const job = await WebhookService.enqueueInboundJob({
      connection,
      instanceName,
      remoteJid,
      eventNormalized: normalizedEvent,
      inboundKind,
      payload: {
        message: message ?? null,
        webhookMessage: data,
        webhookEvent: normalizedEvent || (typeof decodedEvent.event === 'string' ? decodedEvent.event : null),
        eventOriginal: typeof decodedEvent.event === 'string' ? decodedEvent.event : undefined,
      },
      traceLabel: 'evolution',
    });

    return { status: 'queued' as const, jobId: job.id, inboundKind };
  }

  static async handleEvolutionWebhookEvent(rawEvent: Record<string, unknown>) {
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

  private static inboundProcessor: ((job: WebhookInboundJob) => Promise<WebhookJobProcessOutcome>) | null =
    null;
  private static inboundPollMs = Number(process.env.WEBHOOK_QUEUE_POLL_MS) || 4000;
  private static inboundTimer: ReturnType<typeof setInterval> | null = null;
  private static inboundDraining = false;
  private static inboundStarted = false;

  static configureInboundWorker(processJob: (job: WebhookInboundJob) => Promise<WebhookJobProcessOutcome>) {
    WebhookService.inboundProcessor = processJob;
  }

  static startInboundWorker() {
    if (WebhookService.inboundStarted) return;
    WebhookService.inboundStarted = true;
    WebhookService.inboundTimer = setInterval(() => void WebhookService.drainInboundQueue(), WebhookService.inboundPollMs);
    void WebhookService.drainInboundQueue();
  }

  static stopInboundWorker() {
    WebhookService.inboundStarted = false;
    if (WebhookService.inboundTimer) {
      clearInterval(WebhookService.inboundTimer);
      WebhookService.inboundTimer = null;
    }
  }

  static notifyInboundJob() {
    void WebhookService.drainInboundQueue();
  }

  private static async drainInboundQueue() {
    if (WebhookService.inboundDraining || !WebhookService.inboundProcessor) return;
    WebhookService.inboundDraining = true;
    try {
      while (await WebhookService.processNextInboundJob()) {
        /* sequencial */
      }
    } finally {
      WebhookService.inboundDraining = false;
    }
  }

  private static async processNextInboundJob(): Promise<boolean> {
    const candidate = await prisma.webhookInboundJob.findFirst({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
    });
    if (!candidate) return false;

    const locked = await prisma.webhookInboundJob.updateMany({
      where: { id: candidate.id, status: 'pending' },
      data: { status: 'processing', attempt_count: { increment: 1 } },
    });
    if (locked.count === 0) return true;

    const job = await prisma.webhookInboundJob.findUniqueOrThrow({ where: { id: candidate.id } });

    inboundTrace('worker.processando', {
      jobId: job.id,
      attempt: job.attempt_count,
      remoteJid: job.remote_jid,
    });

    const superseded = await hasNewerPendingInboundJob({
      connectionId: job.connection_id,
      remoteJid: job.remote_jid,
      createdAt: job.created_at,
    });
    if (superseded) {
      inboundTrace('worker.superseded', { jobId: job.id });
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: { status: 'superseded', processed_at: new Date(), last_error: null },
      });
      return true;
    }

    try {
      const outcome = await WebhookService.inboundProcessor!(job);
      inboundTrace('worker.concluido', { jobId: job.id, outcome });
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: outcome === 'superseded' ? 'superseded' : 'completed',
          processed_at: new Date(),
          last_error: null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      inboundTrace('worker.erro', { jobId: job.id, error: msg });
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          processed_at: new Date(),
          last_error: msg.slice(0, 2000),
        },
      });
    }

    return true;
  }
}
