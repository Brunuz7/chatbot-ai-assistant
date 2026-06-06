import axios from 'axios';
import type { UserContact } from '@prisma/client';
import { prisma } from '../prisma.js';
import type { EnqueueInboundParams } from '../types/inboundMessage.js';
import { classifyEvolutionInboundKind } from '../utils/evolutionInbound.js';
import { inboundTrace } from '../utils/inboundTrace.js';
import {
  classifyMetaInboundKind,
  metaToRemoteJid,
  metaVerifyToken,
  normalizeMetaMessageForJob,
  parseWhatsappChannel,
} from '../utils/metaInbound.js';
import { InboundMessageWorker } from './InboundMessageWorker.js';
import { UserSettingService } from './UserSettingService.js';
import { WhatsAppService } from './WhatsAppService.js';

const OFFICIAL_TYPE = 'WHATSAPP_OFFICIAL';
const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export class WebhookService {
  static officialPublicUrl(): string | null {
    const webhookUrl = process.env.WEBHOOK_URL?.trim();
    if (webhookUrl) return webhookUrl.replace(/\/webhook\/[^/]+\/?$/i, '/webhook/whatsapp-official');

    const base = process.env.PUBLIC_API_URL?.trim();
    if (base) return `${base.replace(/\/$/, '')}/webhook/whatsapp-official`;
    return null;
  }

  static verifyOfficialSubscription(
    query: Record<string, unknown>,
  ): { ok: true; challenge: string } | { ok: false; reason: string } {
    const mode = String(query['hub.mode'] ?? '');
    const token = String(query['hub.verify_token'] ?? '').trim();
    const challenge = String(query['hub.challenge'] ?? '');
    const expected = metaVerifyToken();

    if (!mode && !token && !challenge) return { ok: false, reason: 'missing_hub_params' };
    if (!expected) return { ok: false, reason: 'meta_verify_token_not_configured' };
    if (mode !== 'subscribe') return { ok: false, reason: 'invalid_hub_mode' };
    if (!token || token !== expected) return { ok: false, reason: 'verify_token_mismatch' };
    if (!challenge) return { ok: false, reason: 'missing_challenge' };

    return { ok: true, challenge };
  }

  static async handleOfficial(body: Record<string, unknown>) {
    if (body.object !== 'whatsapp_business_account')
      return { status: 'ignored', reason: 'not_whatsapp_business_account' };

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const results: unknown[] = [];

    for (const entry of entries) {
      const entryObj = entry as Record<string, unknown>;
      const rawChanges = entryObj.changes;
      const changes = Array.isArray(rawChanges) ? rawChanges : [];

      for (const change of changes) {
        const changeObj = change as Record<string, unknown>;
        const field = String(changeObj.field ?? '');

        if (field === 'messages')
          results.push(await this.processOfficialMessagesChange(changeObj.value as Record<string, unknown>));
        else if (field === 'account_update')
          results.push(await this.processOfficialAccountUpdate(changeObj.value as Record<string, unknown>));
        else results.push({ status: 'ignored', reason: field || 'unknown_field' });
      }
    }

    return { status: 'ok', results };
  }

  static async handleEvolution(rawEvent: Record<string, unknown>) {
    return this.handleEvolutionWebhookEvent(rawEvent);
  }

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
        const found = list.find((c) => c.id === remoteJid || c.remoteJid === remoteJid || c.number === cleanPhone);
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

    if (contact.blocked_until && new Date(contact.blocked_until) > new Date())
      return { blocked: true, reason: 'temporarily_blocked' };

    if (contact.blocked) return { blocked: true, reason: 'contact_blocked' };

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

    InboundMessageWorker.notify();
    return job;
  }

  static async handleEvolutionWebhookEvent(rawEvent: Record<string, unknown>) {
    const decodedEvent = this.decodeWebhookBody(rawEvent);
    const inst = decodedEvent.instance;
    const instanceName = typeof inst === 'string' && inst.trim() ? inst.trim() : '';
    if (!instanceName) return { status: 'invalid', reason: 'no_instance' };

    const normalizedEvent = this.normalizeWebhookEvent(decodedEvent.event as string | undefined);
    if (normalizedEvent !== 'messages.upsert') {
      return { status: 'ignored', reason: normalizedEvent || String(decodedEvent.event ?? 'unknown_event') };
    }

    const data = decodedEvent.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return { status: 'ignored', reason: 'no_data' };

    return this.processReceivedMessageUpsert(decodedEvent, instanceName, normalizedEvent, data);
  }

  private static async processOfficialAccountUpdate(value: Record<string, unknown> | undefined) {
    if (!value || typeof value !== 'object') return { status: 'ignored', reason: 'no_value' };
    return WhatsAppService.applyAccountUpdate(value);
  }

  private static async processOfficialMessagesChange(value: Record<string, unknown> | undefined) {
    if (!value || typeof value !== 'object') return { status: 'ignored', reason: 'no_value' };

    const phoneNumberId = (value.metadata as Record<string, unknown> | undefined)?.phone_number_id;
    if (!phoneNumberId || typeof phoneNumberId !== 'string') return { status: 'ignored', reason: 'no_phone_number_id' };

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
    if (parseWhatsappChannel(settings.whatsapp_channel) !== 'official')
      return { status: 'channel_not_active', phoneNumberId };

    const messages = Array.isArray(value.messages) ? value.messages : [];
    const contacts = Array.isArray(value.contacts) ? value.contacts : [];

    if (messages.length === 0) return { status: 'ignored', reason: 'status_only_or_empty' };
    if (!connection.chatbot_enabled) return { status: 'chatbot_disabled', phoneNumberId };

    const queued: string[] = [];

    for (const raw of messages) {
      const metaMessage = raw as Record<string, unknown>;
      const from = String(metaMessage.from ?? '');
      if (!from) continue;

      const remoteJid = metaToRemoteJid(from);
      const cleanPhone = from.replace(/\D/g, '');

      const contactMeta = contacts.find((c) => String((c as Record<string, unknown>).wa_id ?? '') === from) as
        | Record<string, unknown>
        | undefined;
      const contactName = (contactMeta?.profile as Record<string, unknown> | undefined)?.name?.toString() || 'Sem nome';

      const sync = await this.syncContactForInbound({
        userId: connection.user_id,
        cleanPhone,
        remoteJid,
        contactName,
      });

      if (sync.blocked) continue;

      const job = await this.enqueueInboundJob({
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

    const contactName = await this.resolveEvolutionContactName(
      instanceName,
      remoteJid,
      cleanPhone,
      data,
      message,
      existing?.name,
    );

    const sync = await this.syncContactForInbound({
      userId: connection.user_id,
      cleanPhone,
      remoteJid,
      contactName,
    });

    if (sync.blocked) return { status: sync.reason as 'temporarily_blocked' | 'contact_blocked', phone: cleanPhone };

    const isGroup = remoteJid.includes('@g.us') || (key?.remoteJid as string | undefined)?.includes('@g.us');
    const inboundKind = classifyEvolutionInboundKind(message);
    const shouldEnqueue = connection.chatbot_enabled === true && !isGroup;

    if (!shouldEnqueue) {
      if (!connection.chatbot_enabled) return { status: 'chatbot_disabled' as const };
      return { status: 'ignored_group' as const };
    }

    const job = await this.enqueueInboundJob({
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
}
