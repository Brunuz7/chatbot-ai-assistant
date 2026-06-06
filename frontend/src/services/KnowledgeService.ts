import api from './api';
import type { KbItem, KbPayload } from '../types/knowledge';

export class KnowledgeService {
  async list(): Promise<KbItem[]> {
    const { data } = await api.get<KbItem[]>('/knowledge');
    return data ?? [];
  }

  async create(payload: KbPayload): Promise<KbItem> {
    const { data } = await api.post<KbItem>('/knowledge', payload);
    return data;
  }

  async update(id: string, payload: KbPayload): Promise<KbItem> {
    const { data } = await api.put<KbItem>(`/knowledge/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/knowledge/${id}`);
  }
}

export const knowledgeService = new KnowledgeService();
