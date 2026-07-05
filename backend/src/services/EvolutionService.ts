import axios from 'axios';
import { findUserById } from '../authStore.js';
import { prisma } from '../prisma.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { evolutionHttpStatus, waitForEvolutionQr } from '../utils/evolutionQr.js';
import {
  getEvolutionApiKey,
  getEvolutionApiUrl,
  getWebhookUrl,
  isEvolutionConfigured,
} from '../config/evolution.js';

function evolutionHeaders() {
  return { apikey: getEvolutionApiKey()!, 'Content-Type': 'application/json' };
}

function mapEvolutionAxiosError(err: unknown): Error {
  const status = evolutionHttpStatus(err);
  if (status === 401 || status === 403) return new Error('evolution_unauthorized');
  if (status === 404) return new Error('evolution_instance_not_found');
  return new Error('evolution_unreachable');
}

export class EvolutionService {
  static instanceName(userId: string): string {
    return userId;
  }

  static async setupWebhook(instanceName: string): Promise<void> {
    const evoUrl = getEvolutionApiUrl();
    if (!isEvolutionConfigured() || !evoUrl) return;
    try {
      await axios.post(
        `${evoUrl}/webhook/set/${instanceName}`,
        { enabled: true, url: getWebhookUrl(), byEvents: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
        { headers: evolutionHeaders() },
      );
    } catch (err: unknown) {
      console.error(`Erro ao configurar webhook para ${instanceName}:`, getErrorMessage(err));
    }
  }

  static async getQRCode(userId: string) {
    const evoUrl = getEvolutionApiUrl();
    if (!isEvolutionConfigured() || !evoUrl) throw new Error('evolution_not_configured');

    const user = await findUserById(userId);
    if (!user) throw new Error('user_not_found');

    const instanceName = this.instanceName(user.id);

    let instanceExists = false;

    try {
      const stateResponse = await axios.get(`${evoUrl}/instance/connectionState/${instanceName}`, {
        headers: evolutionHeaders(),
      });

      const state = stateResponse.data?.instance?.state;
      if (state === 'open') return { connected: true, instanceName };
      instanceExists = state != null;
    } catch (err: unknown) {
      const status = evolutionHttpStatus(err);
      if (status === 401 || status === 403) throw new Error('evolution_unauthorized');
      if (status === 404) instanceExists = false;
      else throw mapEvolutionAxiosError(err);
    }

    if (!instanceExists) {
      try {
        await axios.post(
          `${evoUrl}/instance/create`,
          {
            instanceName,
            token: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              enabled: true,
              url: getWebhookUrl(),
              byEvents: false,
              events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            },
          },
          { headers: evolutionHeaders() },
        );
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (err: unknown) {
        const status = evolutionHttpStatus(err);
        if (status === 401 || status === 403) throw new Error('evolution_unauthorized');
        if (status === 403 || getErrorMessage(err).toLowerCase().includes('already in use')) {
          instanceExists = true;
        } else {
          console.error('Evolution create instance:', getErrorMessage(err));
          throw mapEvolutionAxiosError(err);
        }
      }
    }

    try {
      const { base64, code } = await waitForEvolutionQr(async () => {
        const connectResponse = await axios.get(`${evoUrl}/instance/connect/${instanceName}`, {
          headers: evolutionHeaders(),
        });
        return connectResponse.data;
      });

      await prisma.connection.upsert({
        where: { instance_id: instanceName },
        update: { status: 'CONNECTING' },
        create: { name: instanceName, instance_id: instanceName, user_id: user.id, status: 'CONNECTING' },
      });

      return { base64, code, instanceName };
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'already_connected') return { connected: true, instanceName };
        if (err.message === 'qrcode_unavailable') throw err;
      }
      const status = evolutionHttpStatus(err);
      if (status === 401 || status === 403) throw new Error('evolution_unauthorized');
      console.error('Evolution connect/QR:', getErrorMessage(err));
      throw new Error('qrcode_unavailable');
    }
  }

  static async getInstanceStatus(userId: string, options?: { live?: boolean }) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');

    const instanceName = this.instanceName(user.id);
    const evoUrl = getEvolutionApiUrl();
    const shouldPollEvolution = options?.live === true && isEvolutionConfigured() && Boolean(evoUrl);

    const readCached = async (status = 'DISCONNECTED') => {
      const connection = await prisma.connection.upsert({
        where: { instance_id: instanceName },
        update: {},
        create: { name: instanceName, instance_id: instanceName, user_id: user.id, status },
      });
      return {
        connectionStatus: connection.status,
        instanceName,
        chatbotEnabled: connection.chatbot_enabled || false,
      };
    };

    if (!shouldPollEvolution) {
      return readCached();
    }

    let connectionStatus = 'DISCONNECTED';

    try {
      const stateResponse = await axios.get(`${evoUrl}/instance/connectionState/${instanceName}`, {
        headers: evolutionHeaders(),
      });

      const state = stateResponse.data.instance.state;
      if (state === 'open') connectionStatus = 'CONNECTED';
      else if (state === 'connecting') connectionStatus = 'CONNECTING';
    } catch {
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

  static async toggleChatbotForUser(userId: string, enabled: boolean) {
    const { instanceName } = await this.getInstanceStatus(userId);
    const chatbotEnabled = await this.toggleChatbot(instanceName, enabled);
    return { success: true, chatbotEnabled, channel: 'evolution' as const };
  }

  static async sendMessage(instanceName: string, payload: Record<string, unknown>) {
    const evoUrl = getEvolutionApiUrl();
    if (!isEvolutionConfigured() || !evoUrl) {
      return false;
    }

    try {
      const res = await axios.post(`${evoUrl}/message/sendText/${instanceName}`, payload, {
        headers: evolutionHeaders(),
      });

      return res.data;
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: unknown } };
      return false;
    }
  }

  static async sendAudio(
    instanceName: string,
    payload: { number: string; audio: string; delay?: number; encoding?: boolean },
  ): Promise<boolean> {
    const evoUrl = getEvolutionApiUrl();
    if (!isEvolutionConfigured() || !evoUrl) {
      return false;
    }

    const body = {
      number: payload.number,
      audio: payload.audio,
      encoding: payload.encoding !== false,
      delay: payload.delay ?? 1200,
    };

    try {
      const res = await axios.post(`${evoUrl}/message/sendWhatsAppAudio/${instanceName}`, body, {
        headers: evolutionHeaders(),
        timeout: 90_000,
      });

      return true;
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: unknown } };
      return false;
    }
  }

  static async sendImage(
    instanceName: string,
    payload: { number: string; media: string; caption?: string; delay?: number },
  ): Promise<boolean> {
    const evoUrl = getEvolutionApiUrl();
    if (!isEvolutionConfigured() || !evoUrl) {
      return false;
    }

    const body = {
      number: payload.number,
      mediatype: 'image',
      media: payload.media,
      ...(payload.caption?.trim() ? { caption: payload.caption.trim() } : {}),
      delay: payload.delay ?? 800,
    };

    try {
      const res = await axios.post(`${evoUrl}/message/sendMedia/${instanceName}`, body, {
        headers: evolutionHeaders(),
        timeout: 60_000,
      });

      return true;
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: unknown } };
      return false;
    }
  }
}
