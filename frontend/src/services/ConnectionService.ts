import api from './api';
import { createInflightRequest } from '../utils/inflightRequest';
import type {
  ConnectionOverview,
  EvolutionInstanceStatus,
  InstanceQrCodeResponse,
  WhatsappChannel,
} from '../types/connection';

const overviewRequest = createInflightRequest<ConnectionOverview>();

export class ConnectionService {
  async getOverview(options?: { force?: boolean; live?: boolean }): Promise<ConnectionOverview> {
    return overviewRequest.run(async () => {
      const params = options?.live ? { live: '1' } : undefined;
      const { data } = await api.get<ConnectionOverview>('/connection/overview', { params });
      return data;
    }, options?.force);
  }

  async getEvolutionStatus(): Promise<EvolutionInstanceStatus> {
    const { data } = await api.get<EvolutionInstanceStatus>('/instance/status');
    return data;
  }

  async setChannel(channel: WhatsappChannel): Promise<ConnectionOverview> {
    const { data } = await api.patch<{ overview: ConnectionOverview }>('/connection/channel', { channel });
    return data.overview;
  }

  async getQrCode(): Promise<InstanceQrCodeResponse> {
    const { data } = await api.get<InstanceQrCodeResponse>('/instance/qrcode');
    return data;
  }

  async toggleChatbot(enabled: boolean): Promise<{ success: boolean; chatbotEnabled: boolean }> {
    const { data } = await api.post<{ success: boolean; chatbotEnabled: boolean }>(
      '/connection/chatbot/toggle',
      { enabled },
    );
    return data;
  }

  async disconnectOfficial(): Promise<void> {
    await api.post('/whatsapp-official/disconnect');
  }

  async startOfficialSignup(): Promise<void> {
    await api.post('/whatsapp-official/signup/start');
  }

  async completeOfficialSignup(payload: {
    code: string;
    waba_id: string;
    phone_number_id: string;
  }): Promise<void> {
    await api.post('/whatsapp-official/signup/complete', payload);
  }
}

export const connectionService = new ConnectionService();
