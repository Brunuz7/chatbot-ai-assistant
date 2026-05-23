import { prisma } from '../lib/prisma.js';
import { whereNotDeleted } from '../lib/softDelete.js';

export type FlowWriteData = {
  name?: string;
  is_active?: boolean;
  entry_mode?: string;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  type?: string;
  content?: string | null;
  next_flow_id?: string | null;
  metadata?: unknown;
};

function flowDataFromInput(data: FlowWriteData): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.is_active !== undefined) patch.is_active = data.is_active;
  if (data.entry_mode !== undefined) patch.entry_mode = data.entry_mode;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.trigger_keywords !== undefined) patch.trigger_keywords = data.trigger_keywords as object;
  if (data.trigger_intents !== undefined) patch.trigger_intents = data.trigger_intents as object;
  if (data.entry_events !== undefined) patch.entry_events = data.entry_events as object;
  if (data.type !== undefined) patch.type = data.type;
  if (data.content !== undefined) patch.content = data.content;
  if (data.next_flow_id !== undefined) patch.next_flow_id = data.next_flow_id;
  if (data.metadata !== undefined) patch.metadata = (data.metadata as object) ?? {};
  return patch;
}

/** Aceita payload legado com `steps[]` — usa só o primeiro passo. */
export function normalizeFlowPayload(body: Record<string, unknown>): FlowWriteData {
  const steps = body.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    const first = steps[0] as Record<string, unknown>;
    const meta = (first.metadata as Record<string, unknown>) || {};
    const nextStep = String(first.next_step ?? '').trim();
    const targetFlow =
      String(meta.target_flow_id ?? meta.target_step ?? '').trim() ||
      (nextStep && /^[0-9a-f-]{36}$/i.test(nextStep) ? nextStep : '');

    return {
      name: body.name as string | undefined,
      is_active: body.is_active as boolean | undefined,
      entry_mode: body.entry_mode as string | undefined,
      priority: body.priority as number | undefined,
      trigger_keywords: body.trigger_keywords,
      trigger_intents: body.trigger_intents,
      entry_events: body.entry_events,
      type: String(first.type ?? 'interpret'),
      content: (first.content as string | null) ?? null,
      next_flow_id: targetFlow || null,
      metadata: meta,
    };
  }

  return body as FlowWriteData;
}

export class FlowService {
  static async list(agentId: string) {
    return prisma.flow.findMany({
      where: { agent_id: agentId, ...whereNotDeleted },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async listAll(userId: string) {
    return prisma.flow.findMany({
      where: { agent: { user_id: userId, ...whereNotDeleted }, ...whereNotDeleted },
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async create(agentId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = normalizeFlowPayload(raw as Record<string, unknown>);
    return prisma.flow.create({
      data: {
        name: data.name || 'Novo fluxo',
        agent_id: agentId,
        is_active: data.is_active ?? true,
        entry_mode: data.entry_mode ?? 'always_idle',
        priority: data.priority ?? 0,
        trigger_keywords: (data.trigger_keywords as object) ?? [],
        trigger_intents: (data.trigger_intents as object) ?? [],
        entry_events: (data.entry_events as object) ?? [],
        type: data.type ?? 'interpret',
        content: data.content ?? null,
        next_flow_id: data.next_flow_id ?? null,
        metadata: (data.metadata as object) ?? {},
      },
    });
  }

  static async update(id: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = normalizeFlowPayload(raw as Record<string, unknown>);
    const patch = flowDataFromInput(data);
    if (Object.keys(patch).length === 0) {
      return prisma.flow.findUnique({ where: { id } });
    }
    return prisma.flow.update({
      where: { id },
      data: patch as Parameters<typeof prisma.flow.update>[0]['data'],
    });
  }

  static async delete(id: string) {
    return prisma.flow.delete({ where: { id } });
  }
}
