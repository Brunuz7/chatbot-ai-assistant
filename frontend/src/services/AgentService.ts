import api from './api';
import type { Agent, AgentPayload, AgentSummary } from '../types/agent';

export class AgentService {
  async list(): Promise<Agent[]> {
    const { data } = await api.get<Agent[]>('/agents');
    return data;
  }

  async listSummaries(): Promise<AgentSummary[]> {
    const { data } = await api.get<AgentSummary[]>('/agents');
    return data;
  }

  async create(payload: AgentPayload): Promise<Agent> {
    const { data } = await api.post<Agent>('/agents', payload);
    return data;
  }

  async update(id: string, payload: AgentPayload): Promise<Agent> {
    const { data } = await api.put<Agent>(`/agents/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/agents/${id}`);
  }
}

export const agentService = new AgentService();
