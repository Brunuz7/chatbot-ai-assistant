import axios from 'axios';
import type { Connection } from '@prisma/client';
import { prisma } from '../prisma.js';
import type { MetaAccountUpdateResult } from '../types/metaWebhook.js';
import type { OfficialConnectionStatus } from '../types/whatsapp.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { inboundTrace } from '../utils/inboundTrace.js';
import { maskToken } from '../utils/maskToken.js';
import { UserSettingService } from './UserSettingService.js';

const OFFICIAL_TYPE = 'WHATSAPP_OFFICIAL';
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const PENDING_SIGNUP_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export class WhatsAppService {
  static async getStatus(userId: string): Promise<OfficialConnectionStatus> {
    const conn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
      orderBy: { updated_at: 'desc' },
    });

    if (!conn) {
      return {
        connected: false,
        status: 'DISCONNECTED',
        phone_number_id: null,
        waba_id: null,
        business_account_id: null,
        display_phone: null,
        verified_name: null,
        last_validated_at: null,
        has_token: false,
        token_preview: null,
      };
    }

    return {
      connected: conn.status === 'CONNECTED',
      status: conn.status,
      phone_number_id: conn.phone_number_id,
      waba_id: conn.waba_id,
      business_account_id: conn.business_account_id,
      display_phone: conn.display_phone,
      verified_name: conn.verified_name,
      last_validated_at: conn.last_validated_at?.toISOString() ?? null,
      has_token: Boolean(conn.access_token),
      token_preview: maskToken(conn.access_token),
    };
  }

  static async getChatbotEnabled(userId: string): Promise<boolean> {
    const conn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
      select: { chatbot_enabled: true },
    });
    return conn?.chatbot_enabled === true;
  }

  static async disconnect(userId: string) {
    const conn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
    });
    if (!conn) return { success: true };

    await prisma.connection.update({
      where: { id: conn.id },
      data: { status: 'DISCONNECTED', access_token: null, last_validated_at: null },
    });

    return { success: true };
  }

  static async toggleChatbot(userId: string, enabled: boolean) {
    const conn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
    });
    if (!conn) throw new Error('Conecte o WhatsApp Oficial antes de ativar o chatbot.');

    await prisma.connection.update({
      where: { id: conn.id },
      data: { chatbot_enabled: enabled },
    });

    return { success: true, chatbotEnabled: enabled, channel: 'official' as const };
  }

  /** Marca cadastro incorporado Meta em andamento (associado ao utilizador autenticado). */
  static async markSignupPending(userId: string) {
    const existing = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
      orderBy: { updated_at: 'desc' },
    });

    if (existing) {
      await prisma.connection.update({
        where: { id: existing.id },
        data: { status: 'PENDING_SIGNUP', updated_at: new Date() },
      });
      return { ok: true as const };
    }

    await prisma.connection.create({
      data: {
        user_id: userId,
        type: OFFICIAL_TYPE,
        name: 'WhatsApp Oficial',
        status: 'PENDING_SIGNUP',
        chatbot_enabled: true,
      },
    });

    return { ok: true as const };
  }

  /** Webhook Meta `account_update` — evento PARTNER_ADDED após Embedded Signup. */
  static async applyAccountUpdate(value: Record<string, unknown>): Promise<MetaAccountUpdateResult> {
    const event = String(value.event ?? '').trim();
    if (event !== 'PARTNER_ADDED') {
      return { status: 'ignored', reason: 'unsupported_event', event };
    }

    const wabaInfo = value.waba_info as Record<string, unknown> | undefined;
    const wabaId = String(value.waba_id ?? wabaInfo?.waba_id ?? '').trim();
    const ownerBusinessId = String(value.owner_business_id ?? wabaInfo?.owner_business_id ?? '').trim();
    const accessToken = String(value.access_token ?? value.token ?? '').trim();
    let phoneNumberId = String(value.phone_number_id ?? '').trim();

    if (!wabaId) return { status: 'ignored', reason: 'missing_waba_id' };
    if (!accessToken) return { status: 'ignored', reason: 'missing_access_token' };

    let connection = await prisma.connection.findFirst({
      where: { type: OFFICIAL_TYPE, waba_id: wabaId },
      orderBy: { updated_at: 'desc' },
    });

    if (!connection) {
      const pendingSince = new Date(Date.now() - PENDING_SIGNUP_MAX_AGE_MS);
      connection = await prisma.connection.findFirst({
        where: {
          type: OFFICIAL_TYPE,
          status: 'PENDING_SIGNUP',
          updated_at: { gte: pendingSince },
        },
        orderBy: { updated_at: 'desc' },
      });
    }

    if (!connection) {
      inboundTrace('webhook.meta.account_update.no_connection', { wabaId, ownerBusinessId });
      return { status: 'connection_not_found', wabaId };
    }

    let displayPhone: string | null = null;
    let verifiedName: string | null = null;

    if (!phoneNumberId) {
      const phone = await WhatsAppService.fetchPrimaryPhoneNumber(accessToken, wabaId);
      phoneNumberId = phone?.id ?? '';
      displayPhone = phone?.display_phone_number ?? null;
      verifiedName = phone?.verified_name ?? null;
    } else {
      const phone = await WhatsAppService.fetchPhoneNumberDetails(accessToken, phoneNumberId);
      displayPhone = phone?.display_phone_number ?? null;
      verifiedName = phone?.verified_name ?? null;
    }

    if (!phoneNumberId) {
      inboundTrace('webhook.meta.account_update.no_phone', { wabaId });
      return { status: 'error', reason: 'no_phone_number_id', wabaId };
    }

    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'CONNECTED',
        access_token: accessToken,
        waba_id: wabaId,
        business_account_id: ownerBusinessId || connection.business_account_id,
        phone_number_id: phoneNumberId,
        instance_id: phoneNumberId,
        display_phone: displayPhone,
        verified_name: verifiedName,
        last_validated_at: new Date(),
        name: verifiedName || displayPhone || 'WhatsApp Oficial',
      },
    });

    await UserSettingService.getOrCreate(connection.user_id);
    await UserSettingService.setWhatsappChannel(connection.user_id, 'official');

    inboundTrace('webhook.meta.account_update.connected', {
      wabaId,
      phoneNumberId,
      userId: connection.user_id,
    });

    return { status: 'connected', wabaId, phoneNumberId, userId: connection.user_id };
  }

  private static async fetchPrimaryPhoneNumber(
    accessToken: string,
    wabaId: string,
  ): Promise<{ id: string; display_phone_number?: string; verified_name?: string } | null> {
    try {
      const { data } = await axios.get(`${GRAPH_BASE}/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 20000,
      });
      const list = (data as { data?: Record<string, unknown>[] })?.data ?? [];
      const first = list[0];
      if (!first?.id || typeof first.id !== 'string') return null;
      return {
        id: first.id,
        display_phone_number:
          typeof first.display_phone_number === 'string' ? first.display_phone_number : undefined,
        verified_name: typeof first.verified_name === 'string' ? first.verified_name : undefined,
      };
    } catch (err) {
      inboundTrace('webhook.meta.graph.phone_numbers.erro', { wabaId, error: getErrorMessage(err) });
      return null;
    }
  }

  private static async fetchPhoneNumberDetails(
    accessToken: string,
    phoneNumberId: string,
  ): Promise<{ display_phone_number?: string; verified_name?: string } | null> {
    try {
      const { data } = await axios.get(`${GRAPH_BASE}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'display_phone_number,verified_name' },
        timeout: 20000,
      });
      const row = data as Record<string, unknown>;
      return {
        display_phone_number:
          typeof row.display_phone_number === 'string' ? row.display_phone_number : undefined,
        verified_name: typeof row.verified_name === 'string' ? row.verified_name : undefined,
      };
    } catch (err) {
      inboundTrace('webhook.meta.graph.phone.erro', { phoneNumberId, error: getErrorMessage(err) });
      return null;
    }
  }

  static normalizeRecipient(remoteJid: string): string {
    return remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid.replace(/\D/g, '');
  }

  static async sendText(
    connection: Pick<Connection, 'access_token' | 'phone_number_id'>,
    to: string,
    text: string,
  ): Promise<boolean> {
    const token = connection.access_token?.trim();
    const phoneNumberId = connection.phone_number_id?.trim();
    if (!token || !phoneNumberId) return false;

    const recipient = this.normalizeRecipient(to);
    if (!recipient || !text.trim()) return false;

    try {
      inboundTrace('meta.sendText', { phoneNumberId, recipient, textLen: text.length });
      const { data } = await axios.post(
        `${GRAPH_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { preview_url: false, body: text.trim() },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      const messageId = (data as { messages?: { id?: string }[] })?.messages?.[0]?.id;
      inboundTrace('meta.sendText.ok', { phoneNumberId, messageId: messageId ?? null });
      return Boolean(messageId);
    } catch (err) {
      inboundTrace('meta.sendText.erro', {
        phoneNumberId,
        error: getErrorMessage(err),
      });
      return false;
    }
  }

  static async sendImage(
    connection: Pick<Connection, 'access_token' | 'phone_number_id'>,
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<boolean> {
    const token = connection.access_token?.trim();
    const phoneNumberId = connection.phone_number_id?.trim();
    if (!token || !phoneNumberId) return false;

    const recipient = this.normalizeRecipient(to);
    const link = imageUrl.trim();
    if (!recipient || !link) return false;

    try {
      inboundTrace('meta.sendImage', { phoneNumberId, recipient });
      const { data } = await axios.post(
        `${GRAPH_BASE}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'image',
          image: {
            link,
            ...(caption?.trim() ? { caption: caption.trim() } : {}),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      const messageId = (data as { messages?: { id?: string }[] })?.messages?.[0]?.id;
      inboundTrace('meta.sendImage.ok', { phoneNumberId, messageId: messageId ?? null });
      return Boolean(messageId);
    } catch (err) {
      inboundTrace('meta.sendImage.erro', { phoneNumberId, error: getErrorMessage(err) });
      return false;
    }
  }

  /** Resposta de texto pela Cloud API (áudio TTS ainda não suportado no canal oficial). */
  static async deliverReply(connection: Connection, remoteJid: string, replyText: string): Promise<'text' | 'none'> {
    const ok = await this.sendText(connection, remoteJid, replyText);
    return ok ? 'text' : 'none';
  }
}
