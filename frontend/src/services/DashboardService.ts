import api from './api';
import { createInflightRequest } from '../utils/inflightRequest';
import type { DashboardOverview, DashboardStatsPeriod } from '../types/dashboard';

const statsInflight = new Map<DashboardStatsPeriod, ReturnType<typeof createInflightRequest<DashboardOverview>>>();

function statsRequest(period: DashboardStatsPeriod) {
  let req = statsInflight.get(period);
  if (!req) {
    req = createInflightRequest<DashboardOverview>();
    statsInflight.set(period, req);
  }
  return req;
}

export class DashboardService {
  async getOverview(period: DashboardStatsPeriod, options?: { force?: boolean }): Promise<DashboardOverview> {
    return statsRequest(period).run(async () => {
      const { data } = await api.get<DashboardOverview>('/dashboard/stats', { params: { period } });
      return data;
    }, options?.force);
  }
}

export const dashboardService = new DashboardService();
