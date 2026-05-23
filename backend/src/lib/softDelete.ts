import type { Prisma } from '@prisma/client';

/** Modelos com `deleted_at` — entidades de negócio que o utilizador gere no painel. */
export const SOFT_DELETE_MODELS = new Set<string>([
  'User',
  'UserContact',
  'UserInstruction',
  'Agent',
  'Flow',
  'KnowledgeBase',
  'Tag',
]);

export function modelUsesSoftDelete(model: string): boolean {
  return SOFT_DELETE_MODELS.has(model);
}

/** Filtro padrão: apenas registos activos (não apagados). */
export const whereNotDeleted = { deleted_at: null } as const;

/** Include de relações sem registos apagados. */
export const includeFlowsActive = { where: whereNotDeleted } as const;

type WhereInput = Record<string, unknown> | undefined;

export function withNotDeleted(where?: WhereInput): Record<string, unknown> {
  if (!where || Object.keys(where).length === 0) {
    return { ...whereNotDeleted };
  }
  return { AND: [where, whereNotDeleted] };
}
