import api from './api';

export type FlowRecord = {
  id: string;
  name: string;
  agent_id?: string | null;
  is_active: boolean;
  entry_mode?: string;
  entry_instruction?: string | null;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  type?: string;
  content?: string | null;
  next_flow_id?: string | null;
  metadata?: Record<string, unknown>;
  agent?: { name: string } | null;
  steps?: Array<{
    type: string;
    content?: string;
    next_step?: string;
    metadata?: Record<string, unknown>;
  }>;
};

export class FlowService {
  async list(): Promise<FlowRecord[]> {
    const { data } = await api.get<FlowRecord[]>('/flows');
    return Array.isArray(data) ? data : [];
  }

  async create(payload: unknown): Promise<FlowRecord> {
    const { data } = await api.post<FlowRecord>('/flows', payload);
    return data;
  }

  async update(id: string, payload: unknown): Promise<FlowRecord> {
    const { data } = await api.put<FlowRecord>(`/flows/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/flows/${id}`);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await api.put(`/flows/${id}`, { is_active: isActive });
  }
}

export const flowService = new FlowService();
