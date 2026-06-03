import axios from 'axios';
import { findUserById } from '../authStore.js';
import {
  metaAppId,
  metaAppSecret,
  metaEmbeddedSignupAvailable,
  metaEmbeddedSignupConfigId,
  metaGraphBase,
  metaGraphVersion,
  metaRegisterPin,
} from '../lib/metaConfig.js';
import { prisma } from '../lib/prisma.js';
import { inboundTrace } from '../lib/inboundTrace.js';
import { parseWhatsappChannel, type WhatsappChannel, WHATSAPP_CHANNELS } from '../lib/whatsappChannel.js';
import type { Connection } from '@prisma/client';
import { UserSettingService } from './UserSettingService.js';
import { WebhookService } from './WebhookService.js';

const OFFICIAL_TYPE = 'WHATSAPP_OFFICIAL';
const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3001}/api/webhook/evolution`;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type EmbeddedSignupCompleteInput = {
  code: string;
  waba_id: string;
  phone_number_id: string;
  business_account_id?: string;
  pin?: string;
};

export type OfficialConnectionStatus = {
  connected: boolean;
  status: string;
  phone_number_id: string | null;
  waba_id: string | null;
  business_account_id: string | null;
  display_phone: string | null;
  verified_name: string | null;
  last_validated_at: string | null;
  has_token: boolean;
  token_preview: string | null;
};

function maskToken(token: string | null | undefined): string | null {
  if (!token || token.length < 8) return null;
  return `••••${token.slice(-4)}`;
}

function graphErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string; error_user_msg?: string } } | undefined;
    return data?.error?.error_user_msg || data?.error?.message || err.message;
  }
  return err instanceof Error ? err.message : 'Erro desconhecido';
}

export class ConnectionService {

  static async getActiveChannel(userId: string): Promise<WhatsappChannel> {
    const settings = await UserSettingService.getOrCreate(userId);
    return parseWhatsappChannel(settings.whatsapp_channel);
  }

  static async setChannel(userId: string, channel: string) {
    if (!WHATSAPP_CHANNELS.includes(channel as WhatsappChannel)) {
      throw new Error('Canal inválido. Use evolution ou official.');
    }
    const parsed = channel as WhatsappChannel;
    await prisma.userSetting.update({
      where: { user_id: userId },
      data: { whatsapp_channel: parsed },
    });
    return { whatsapp_channel: parsed };
  }

  static async getOverview(userId: string) {
    const settings = await UserSettingService.getOrCreate(userId);
    const whatsapp_channel = parseWhatsappChannel(settings.whatsapp_channel);

    const evolution = await ConnectionService.getInstanceStatus(userId);
    const official = await ConnectionService.getOfficialStatus(userId);

    const officialConn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
      select: { chatbot_enabled: true },
    });

    const evolutionConnected = evolution.connectionStatus === 'CONNECTED';
    const officialConnected = official.connected;

    const activeConnected = whatsapp_channel === 'official' ? officialConnected : evolutionConnected;
    const activeChatbotEnabled =
      whatsapp_channel === 'official'
        ? officialConn?.chatbot_enabled === true
        : evolution.chatbotEnabled;

    return {
      whatsapp_channel,
      official_webhook_url: WebhookService.officialPublicUrl(),
      meta_verify_token_configured: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()),
      embedded_signup: ConnectionService.getEmbeddedSignupConfig(),
      evolution: {
        connectionStatus: evolution.connectionStatus,
        instanceName: evolution.instanceName,
        chatbotEnabled: evolution.chatbotEnabled,
        connected: evolutionConnected,
      },
      official: {
        ...official,
        chatbotEnabled: officialConn?.chatbot_enabled === true,
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



  static async listAll() {
    return prisma.connection.findMany();
  }

  static listAutomations() {
    return [];
  }


  static sanitizeInstanceName(name: string, id: string) {
    const sanitized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_${id.slice(0, 4)}`;
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

  static async toggleEvolutionChatbot(instanceName: string, enabled: boolean) {
    await prisma.connection.update({ where: { instance_id: instanceName }, data: { chatbot_enabled: enabled } });
    if (enabled) await ConnectionService.setupEvolutionWebhook(instanceName);
    return enabled;
  }

  static getEmbeddedSignupConfig() {
    return {
      available: metaEmbeddedSignupAvailable(),
      app_id: metaAppId(),
      config_id: metaEmbeddedSignupConfigId(),
      graph_version: metaGraphVersion(),
      register_pin_configured: Boolean(metaRegisterPin()),
    };
  }

  static async exchangeCodeForToken(code: string): Promise<string> {
    const appId = metaAppId();
    const appSecret = metaAppSecret();
    if (!appId || !appSecret) {
      throw new Error('META_APP_ID e META_APP_SECRET são obrigatórios no servidor.');
    }

    const trimmed = code?.trim();
    if (!trimmed) throw new Error('Código de autorização é obrigatório.');

    try {
      const { data } = await axios.get(`${metaGraphBase()}/oauth/access_token`, {
        params: {
          client_id: appId,
          client_secret: appSecret,
          code: trimmed,
        },
        timeout: 15000,
      });

      const token =
        typeof data === 'string'
          ? data
          : (data as { access_token?: string })?.access_token;

      if (!token || typeof token !== 'string') {
        throw new Error('Resposta da Meta sem access_token.');
      }
      return token;
    } catch (err) {
      throw new Error(`Falha ao trocar código por token: ${graphErrorMessage(err)}`);
    }
  }

  static async subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
    try {
      await axios.post(
        `${metaGraphBase()}/${wabaId}/subscribed_apps`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 15000,
        },
      );
    } catch (err) {
      throw new Error(`Falha ao subscrever webhooks na WABA: ${graphErrorMessage(err)}`);
    }
  }

  static async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${metaGraphBase()}/${phoneNumberId}/register`,
        {
          messaging_product: 'whatsapp',
          pin,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
    } catch (err) {
      const msg = graphErrorMessage(err);
      if (/already registered/i.test(msg)) return;
      throw new Error(`Falha ao registar número na Cloud API: ${msg}`);
    }
  }

  static async completeEmbeddedSignup(userId: string, input: EmbeddedSignupCompleteInput) {
    if (!metaEmbeddedSignupAvailable()) {
      throw new Error(
        'Cadastro incorporado não configurado. Defina META_APP_ID, META_APP_SECRET e META_EMBEDDED_SIGNUP_CONFIG_ID.',
      );
    }

    const wabaId = input.waba_id?.trim();
    const phoneNumberId = input.phone_number_id?.trim();
    if (!wabaId) throw new Error('WABA ID é obrigatório.');
    if (!phoneNumberId) throw new Error('Phone Number ID é obrigatório.');

    const pin = input.pin?.trim() || metaRegisterPin();
    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new Error(
        'PIN de 6 dígitos necessário para registo do número. Configure META_WHATSAPP_REGISTER_PIN no servidor ou envie no pedido.',
      );
    }

    const accessToken = await ConnectionService.exchangeCodeForToken(input.code);
    await ConnectionService.subscribeAppToWaba(wabaId, accessToken);
    await ConnectionService.registerPhoneNumber(phoneNumberId, accessToken, pin);

    return ConnectionService.validateAndSave(userId, {
      access_token: accessToken,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      business_account_id: input.business_account_id?.trim() || undefined,
    });
  }

  static async getOfficialStatus(userId: string): Promise<OfficialConnectionStatus> {
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

  static async validateAndSave(
    userId: string,
    input: {
      access_token: string;
      phone_number_id: string;
      waba_id: string;
      business_account_id?: string;
    },
  ) {
    const accessToken = input.access_token?.trim();
    const phoneNumberId = input.phone_number_id?.trim();
    const wabaId = input.waba_id?.trim();
    const businessAccountId = input.business_account_id?.trim() || null;

    if (!accessToken) throw new Error('Access Token é obrigatório.');
    if (!phoneNumberId) throw new Error('Phone Number ID é obrigatório.');
    if (!wabaId) throw new Error('WABA ID é obrigatório.');

    const phone = await ConnectionService.fetchPhoneNumber(accessToken, phoneNumberId);
    await ConnectionService.fetchWaba(accessToken, wabaId);

    if (businessAccountId) {
      await ConnectionService.fetchBusinessAccount(accessToken, businessAccountId);
    }

    const displayPhone = (phone.display_phone_number as string | undefined) ?? null;
    const verifiedName = (phone.verified_name as string | undefined) ?? null;
    const connectionName = verifiedName || displayPhone || `WhatsApp ${phoneNumberId}`;

    const existing = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE },
    });

    const data = {
      name: connectionName,
      type: OFFICIAL_TYPE,
      status: 'CONNECTED',
      instance_id: phoneNumberId,
      access_token: accessToken,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      business_account_id: businessAccountId,
      display_phone: displayPhone,
      verified_name: verifiedName,
      last_validated_at: new Date(),
    };

    const conn = existing
      ? await prisma.connection.update({ where: { id: existing.id }, data })
      : await prisma.connection.create({ data: { ...data, user_id: userId } });

    return {
      success: true,
      connection: {
        id: conn.id,
        status: conn.status,
        phone_number_id: conn.phone_number_id,
        waba_id: conn.waba_id,
        business_account_id: conn.business_account_id,
        display_phone: conn.display_phone,
        verified_name: conn.verified_name,
        last_validated_at: conn.last_validated_at?.toISOString() ?? null,
        token_preview: maskToken(conn.access_token),
      },
    };
  }

  private static async fetchPhoneNumber(accessToken: string, phoneNumberId: string) {
    try {
      const { data } = await axios.get(`${GRAPH_BASE}/${phoneNumberId}`, {
        params: { fields: 'id,display_phone_number,verified_name,quality_rating' },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });
      return data as Record<string, unknown>;
    } catch (err) {
      throw new Error(`Falha ao validar Phone Number ID: ${graphErrorMessage(err)}`);
    }
  }

  private static async fetchWaba(accessToken: string, wabaId: string) {
    try {
      await axios.get(`${GRAPH_BASE}/${wabaId}`, {
        params: { fields: 'id,name,account_review_status' },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });
    } catch (err) {
      throw new Error(`Falha ao validar WABA ID: ${graphErrorMessage(err)}`);
    }
  }

  private static async fetchBusinessAccount(accessToken: string, businessAccountId: string) {
    try {
      await axios.get(`${GRAPH_BASE}/${businessAccountId}`, {
        params: { fields: 'id,name' },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });
    } catch (err) {
      throw new Error(`Falha ao validar Business Account ID: ${graphErrorMessage(err)}`);
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
        error: graphErrorMessage(err),
      });
      return false;
    }
  }

  /** Resposta de texto pela Cloud API (áudio TTS ainda não suportado no canal oficial). */
  static async deliverOfficialReply(
    connection: Connection,
    remoteJid: string,
    replyText: string,
  ): Promise<'text' | 'none'> {
    const ok = await this.sendText(connection, remoteJid, replyText);
    return ok ? 'text' : 'none';
  }

  static async disconnectOfficial(userId: string) {
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
    const channel = await this.getActiveChannel(userId);

    if (channel === 'official') {
      const conn = await prisma.connection.findFirst({
        where: { user_id: userId, type: OFFICIAL_TYPE },
      });
      if (!conn) throw new Error('Conecte o WhatsApp Oficial antes de activar o chatbot.');
      await prisma.connection.update({
        where: { id: conn.id },
        data: { chatbot_enabled: enabled },
      });
      return { success: true, chatbotEnabled: enabled, channel };
    }

    const evolution = await ConnectionService.getInstanceStatus(userId);
    if (evolution.connectionStatus !== 'CONNECTED') {
      throw new Error('Conecte o WhatsApp (QR) antes de activar o chatbot.');
    }
    const chatbotEnabled = await ConnectionService.toggleEvolutionChatbot(
      evolution.instanceName,
      enabled,
    );
    return { success: true, chatbotEnabled, channel };
  }

  static async setupEvolutionWebhook(instanceName: string) {
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

  static async sendEvolutionMessage(instanceName: string, payload: Record<string, unknown>) {
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

  static async sendEvolutionAudio(
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
}
