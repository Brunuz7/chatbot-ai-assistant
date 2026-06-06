import { prisma, whereNotDeleted } from '../prisma.js';
import type { FlowWriteData } from '../types/index.js';

export class FlowService {
  private static flowDataFromInput(data: FlowWriteData): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.agent_id !== undefined) patch.agent_id = data.agent_id;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.entry_mode !== undefined) patch.entry_mode = data.entry_mode;
    if (data.entry_instruction !== undefined) patch.entry_instruction = data.entry_instruction;
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
  private static normalizeFlowPayload(body: Record<string, unknown>): FlowWriteData {
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
        agent_id: body.agent_id as string | null | undefined,
        is_active: body.is_active as boolean | undefined,
        entry_mode: body.entry_mode as string | undefined,
        entry_instruction: body.entry_instruction as string | null | undefined,
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

  private static async resolveAgentIdForUser(userId: string, agentId: string | null | undefined): Promise<string | null> {
    if (!agentId?.trim()) return null;
    const agent = await prisma.agent.findFirst({
      where: { id: agentId.trim(), user_id: userId, ...whereNotDeleted },
      select: { id: true },
    });
    return agent?.id ?? null;
  }

  static async list(agentId: string) {
    return prisma.flow.findMany({
      where: { agent_id: agentId, ...whereNotDeleted },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async listAll(userId: string) {
    return prisma.flow.findMany({
      where: { user_id: userId, ...whereNotDeleted },
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async create(userId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = FlowService.normalizeFlowPayload(raw as Record<string, unknown>);
    const agentId = await FlowService.resolveAgentIdForUser(userId, data.agent_id);
    const entryInstruction = String(data.entry_instruction ?? '').trim() || null;

    return prisma.flow.create({
      data: {
        name: data.name || 'Novo fluxo',
        user_id: userId,
        agent_id: agentId,
        is_active: data.is_active ?? true,
        entry_mode: 'instruction',
        entry_instruction: entryInstruction,
        priority: data.priority ?? 0,
        trigger_keywords: [],
        trigger_intents: [],
        entry_events: (data.entry_events as object) ?? [],
        type: data.type ?? 'interpret',
        content: data.content ?? null,
        next_flow_id: data.next_flow_id ?? null,
        metadata: (data.metadata as object) ?? {},
      },
    });
  }

  static async update(id: string, userId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = FlowService.normalizeFlowPayload(raw as Record<string, unknown>);
    const patch = FlowService.flowDataFromInput(data);

    if (data.agent_id !== undefined) patch.agent_id = await FlowService.resolveAgentIdForUser(userId, data.agent_id);

    if (data.entry_instruction !== undefined) {
      const trimmed = String(data.entry_instruction ?? '').trim();
      patch.entry_instruction = trimmed || null;
      patch.entry_mode = 'instruction';
      patch.trigger_keywords = [];
      patch.trigger_intents = [];
    }

    if (Object.keys(patch).length === 0) return prisma.flow.findUnique({ where: { id } });

    return prisma.flow.update({
      where: { id },
      data: patch as Parameters<typeof prisma.flow.update>[0]['data'],
    });
  }

  static async delete(id: string) {
    return prisma.flow.delete({ where: { id } });
  }

  static async belongsToUser(flowId: string, userId: string) {
    return prisma.flow.findFirst({ where: { id: flowId, user_id: userId, ...whereNotDeleted }, select: { id: true } });
  }
}
