export type PlanId = 'starter' | 'pro' | 'exclusivo';

export type PlanFeatureKey =
  | 'agents'
  | 'flows'
  | 'knowledge_bases'
  | 'bulk_messaging'
  | 'trained_ai'
  | 'smart_summary'
  | 'audio_to_text'
  | 'whatsapp_recovery'
  | 'lead_qualification'
  | 'exclusive_support';

export type PublicPlanFeature = {
  key: PlanFeatureKey;
  label: string;
  kind: 'limit' | 'boolean';
  value: number | null | boolean;
  displayValue: string;
  included: boolean;
};

export type PublicPlan = {
  id: PlanId;
  name: string;
  subtitle: string | null;
  priceCents: number | null;
  priceLabel: string;
  highlighted: boolean;
  features: PublicPlanFeature[];
};

export type UserPlanUsage = {
  agents: number;
  flows: number;
  knowledge_bases: number;
};

export type UserPlanSummary = PublicPlan & {
  usage: UserPlanUsage;
  limits: {
    agents: number | null;
    flows: number | null;
    knowledge_bases: number | null;
  };
  flags: Record<
    | 'bulk_messaging'
    | 'trained_ai'
    | 'smart_summary'
    | 'audio_to_text'
    | 'whatsapp_recovery'
    | 'lead_qualification'
    | 'exclusive_support',
    boolean
  >;
};
