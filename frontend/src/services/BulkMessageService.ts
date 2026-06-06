import api from './api';
import type {
  BulkCampaign,
  BulkCampaignAction,
  BulkLimits,
  CreateBulkCampaignPayload,
} from '../types/bulkMessage';

export class BulkMessageService {
  async listCampaigns(): Promise<BulkCampaign[]> {
    const { data } = await api.get<BulkCampaign[]>('/bulk-messages');
    return data ?? [];
  }

  async getLimits(): Promise<BulkLimits> {
    const { data } = await api.get<BulkLimits>('/bulk-messages/limits');
    return data;
  }

  async createCampaign(payload: CreateBulkCampaignPayload): Promise<BulkCampaign> {
    const { data } = await api.post<BulkCampaign>('/bulk-messages', payload);
    return data;
  }

  async runAction(id: string, action: BulkCampaignAction): Promise<void> {
    await api.post(`/bulk-messages/${id}/${action}`);
  }
}

export const bulkMessageService = new BulkMessageService();
