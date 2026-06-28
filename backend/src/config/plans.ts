/**
 * Catálogo de funcionalidades e planos — fonte única de verdade.
 *
 * Para adicionar/remover uma funcionalidade de um plano:
 * 1. Registre em PLAN_FEATURES (se for nova)
 * 2. Ajuste o valor em PLANS.<plano>.features
 *
 * Limites numéricos: número = máximo | null = ilimitado
 * Flags booleanas: true = incluído | false = não incluído
 */

export type PlanId = 'starter' | 'pro' | 'exclusivo';

export type LimitFeatureKey = 'agents' | 'flows' | 'knowledge_bases';
export type BooleanFeatureKey =
  | 'bulk_messaging'
  | 'trained_ai'
  | 'smart_summary'
  | 'audio_to_text'
  | 'whatsapp_recovery'
  | 'lead_qualification'
  | 'exclusive_support';

export type PlanFeatureKey = LimitFeatureKey | BooleanFeatureKey;

export type PlanFeatureDefinition =
  | { key: LimitFeatureKey; label: string; kind: 'limit'; description?: string }
  | { key: BooleanFeatureKey; label: string; kind: 'boolean'; description?: string };

/** Metadados das funcionalidades — edite aqui para renomear ou adicionar novas. */
export const PLAN_FEATURES: readonly PlanFeatureDefinition[] = [
  { key: 'agents', label: 'Agentes de uso', kind: 'limit' },
  { key: 'flows', label: 'Fluxos de atendimento', kind: 'limit' },
  { key: 'knowledge_bases', label: 'Bases de conhecimento', kind: 'limit' },
  { key: 'bulk_messaging', label: 'Disparador de mensagem em massa', kind: 'boolean' },
  { key: 'trained_ai', label: 'IA treinada', kind: 'boolean' },
  { key: 'smart_summary', label: 'Resumo inteligente de atendimento', kind: 'boolean' },
  { key: 'audio_to_text', label: 'Áudio convertido em texto', kind: 'boolean' },
  { key: 'whatsapp_recovery', label: 'Recuperação de clientes no WhatsApp', kind: 'boolean' },
  { key: 'lead_qualification', label: 'Qualificação de lead', kind: 'boolean' },
  { key: 'exclusive_support', label: 'Atendimento exclusivo', kind: 'boolean' },
] as const;

export type PlanFeatureValues = Record<LimitFeatureKey, number | null> & Record<BooleanFeatureKey, boolean>;

export type PlanDefinition = {
  id: PlanId;
  name: string;
  /** Subtítulo exibido no card (ex.: "Venda e atendimento personalizado") */
  subtitle: string | null;
  /** Preço mensal em centavos; null = sob consulta */
  priceCents: number | null;
  /** Texto formatado do preço (ex.: "R$ 89,90" ou "A combinar") */
  priceLabel: string;
  sortOrder: number;
  highlighted: boolean;
  features: PlanFeatureValues;
};

const STARTER_FEATURES: PlanFeatureValues = {
  agents: 2,
  flows: 2,
  knowledge_bases: 5,
  bulk_messaging: true,
  trained_ai: false,
  smart_summary: false,
  audio_to_text: false,
  whatsapp_recovery: false,
  lead_qualification: false,
  exclusive_support: false,
};

const PRO_FEATURES: PlanFeatureValues = {
  agents: 5,
  flows: 5,
  knowledge_bases: 10,
  bulk_messaging: true,
  trained_ai: true,
  smart_summary: true,
  audio_to_text: true,
  whatsapp_recovery: true,
  lead_qualification: true,
  exclusive_support: false,
};

const EXCLUSIVO_FEATURES: PlanFeatureValues = {
  agents: null,
  flows: null,
  knowledge_bases: null,
  bulk_messaging: true,
  trained_ai: true,
  smart_summary: true,
  audio_to_text: true,
  whatsapp_recovery: true,
  lead_qualification: true,
  exclusive_support: true,
};

/** Definição dos planos — edite limites e flags aqui. */
export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'STARTER',
    subtitle: null,
    priceCents: 8990,
    priceLabel: 'R$ 89,90',
    sortOrder: 1,
    highlighted: false,
    features: STARTER_FEATURES,
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    subtitle: 'Venda e atendimento personalizado',
    priceCents: 11990,
    priceLabel: 'R$ 119,90',
    sortOrder: 2,
    highlighted: true,
    features: PRO_FEATURES,
  },
  exclusivo: {
    id: 'exclusivo',
    name: 'EXCLUSIVO',
    subtitle: 'Solução sob medida para sua operação',
    priceCents: null,
    priceLabel: 'A combinar',
    sortOrder: 3,
    highlighted: false,
    features: EXCLUSIVO_FEATURES,
  },
};

export const DEFAULT_PLAN_ID: PlanId = 'starter';

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export function getPlan(planId: string): PlanDefinition {
  if (isPlanId(planId)) return PLANS[planId];
  return PLANS[DEFAULT_PLAN_ID];
}

export function listPlans(): PlanDefinition[] {
  return PLAN_IDS.map((id) => PLANS[id]).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatLimitValue(limit: number | null): string {
  if (limit === null) return 'Ilimitado';
  return String(limit);
}

export function formatFeatureValue(key: PlanFeatureKey, value: number | null | boolean): string {
  const def = PLAN_FEATURES.find((f) => f.key === key);
  if (!def) return String(value);

  if (def.kind === 'limit') {
    const n = value as number | null;
    if (n === null) return 'Ilimitado';
    return n === 1 ? '1 item' : `${n} itens`;
  }

  return value ? 'Incluído' : 'Não incluído';
}

export type PublicPlanDto = {
  id: PlanId;
  name: string;
  subtitle: string | null;
  priceCents: number | null;
  priceLabel: string;
  highlighted: boolean;
  features: Array<{
    key: PlanFeatureKey;
    label: string;
    kind: 'limit' | 'boolean';
    value: number | null | boolean;
    displayValue: string;
    included: boolean;
  }>;
};

export function toPublicPlan(plan: PlanDefinition): PublicPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    subtitle: plan.subtitle,
    priceCents: plan.priceCents,
    priceLabel: plan.priceLabel,
    highlighted: plan.highlighted,
    features: PLAN_FEATURES.map((def) => {
      const value = plan.features[def.key];
      const included = def.kind === 'limit' ? value !== 0 : Boolean(value);
      return {
        key: def.key,
        label: def.label,
        kind: def.kind,
        value,
        displayValue: formatFeatureValue(def.key, value),
        included,
      };
    }).filter((f) => f.included),
  };
}

export function listPublicPlans(): PublicPlanDto[] {
  return listPlans().map(toPublicPlan);
}
