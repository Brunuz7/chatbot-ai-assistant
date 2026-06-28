import api from './api';
import type { PublicPlan, UserPlanSummary } from '../types/plan';

export class PlanService {
  static async listPublic(): Promise<PublicPlan[]> {
    const { data } = await api.get<PublicPlan[]>('/plans');
    return data;
  }

  static async getMine(): Promise<UserPlanSummary> {
    const { data } = await api.get<UserPlanSummary>('/me/plan');
    return data;
  }
}
