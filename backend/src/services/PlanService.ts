import { prisma } from '../prisma.js';
import {
  DEFAULT_PLAN_ID,
  getPlan,
  isPlanId,
  listPublicPlans,
  type BooleanFeatureKey,
  type LimitFeatureKey,
  type PlanId,
  type PublicPlanDto,
} from '../config/plans.js';

export type UserPlanUsage = {
  agents: number;
  flows: number;
  knowledge_bases: number;
};

export type UserPlanSummary = PublicPlanDto & {
  usage: UserPlanUsage;
  limits: Record<LimitFeatureKey, number | null>;
  flags: Record<BooleanFeatureKey, boolean>;
};

export class PlanLimitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export class PlanService {
  static async getUserPlanId(userId: string): Promise<PlanId> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan_id: true },
    });
    if (!user) throw new Error('User not found');
    return isPlanId(user.plan_id) ? user.plan_id : DEFAULT_PLAN_ID;
  }

  static async getUserPlanSummary(userId: string): Promise<UserPlanSummary> {
    const planId = await this.getUserPlanId(userId);
    const plan = getPlan(planId);
    const usage = await this.getUsage(userId);

    return {
      ...listPublicPlans().find((p) => p.id === planId)!,
      usage,
      limits: {
        agents: plan.features.agents,
        flows: plan.features.flows,
        knowledge_bases: plan.features.knowledge_bases,
      },
      flags: {
        bulk_messaging: plan.features.bulk_messaging,
        trained_ai: plan.features.trained_ai,
        smart_summary: plan.features.smart_summary,
        audio_to_text: plan.features.audio_to_text,
        whatsapp_recovery: plan.features.whatsapp_recovery,
        lead_qualification: plan.features.lead_qualification,
        exclusive_support: plan.features.exclusive_support,
      },
    };
  }

  static listPublicPlans(): PublicPlanDto[] {
    return listPublicPlans();
  }

  static async getUsage(userId: string): Promise<UserPlanUsage> {
    const [agents, flows, knowledge_bases] = await Promise.all([
      prisma.agent.count({ where: { user_id: userId, deleted_at: null } }),
      prisma.flow.count({ where: { user_id: userId, deleted_at: null } }),
      prisma.knowledgeBase.count({ where: { user_id: userId, deleted_at: null } }),
    ]);

    return { agents, flows, knowledge_bases };
  }

  static async assertLimit(userId: string, resource: LimitFeatureKey): Promise<void> {
    const planId = await this.getUserPlanId(userId);
    const limit = getPlan(planId).features[resource];
    if (limit === null) return;

    const usage = await this.getUsage(userId);
    const current = usage[resource];
    if (current >= limit) {
      throw new PlanLimitError(`Limite do plano atingido para ${resource}`, `plan_limit_${resource}`);
    }
  }

  static async assertFeature(userId: string, feature: BooleanFeatureKey): Promise<void> {
    const planId = await this.getUserPlanId(userId);
    const enabled = getPlan(planId).features[feature];
    if (!enabled) {
      throw new PlanLimitError(`Funcionalidade não disponível no plano atual`, `plan_feature_${feature}`);
    }
  }

  static async hasFeature(userId: string, feature: BooleanFeatureKey): Promise<boolean> {
    const planId = await this.getUserPlanId(userId);
    return getPlan(planId).features[feature];
  }
}
