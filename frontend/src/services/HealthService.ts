import api from './api';

export type DbHealthStatus = 'connected' | 'disconnected';

export class HealthService {
  async checkDatabase(): Promise<DbHealthStatus> {
    try {
      const { data } = await api.get<{ status?: string }>('/health/db');
      return data.status === 'connected' ? 'connected' : 'disconnected';
    } catch {
      return 'disconnected';
    }
  }
}

export const healthService = new HealthService();
