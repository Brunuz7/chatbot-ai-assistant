import { prisma } from '../lib/prisma.js';

export class FlowService {
  static async list(agentId: string) {
    return prisma.Flow.findMany({
      where: { agent_id: agentId },
      include: { steps: true },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async listAll(userId: string) {
    return prisma.Flow.findMany({
      where: { agent: { user_id: userId } },
      include: { agent: true, steps: true },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async create(
    agentId: string,
    data: {
      name: string;
      is_active?: boolean;
      steps: unknown[];
      entry_mode?: string;
      entry_step_key?: string | null;
      priority?: number;
      trigger_keywords?: unknown;
      trigger_intents?: unknown;
      entry_events?: unknown;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const flow = await tx.flow.create({
        data: {
          name: data.name,
          agent_id: agentId,
          is_active: data.is_active ?? true,
          entry_mode: data.entry_mode ?? 'always_idle',
          entry_step_key: data.entry_step_key ?? null,
          priority: data.priority ?? 0,
          trigger_keywords: (data.trigger_keywords as object) ?? [],
          trigger_intents: (data.trigger_intents as object) ?? [],
          entry_events: (data.entry_events as object) ?? [],
        },
      });

      if (data.steps && data.steps.length > 0) {
        await tx.flowStep.createMany({
          data: data.steps.map((s: any) => ({
            flow_id: flow.id,
            key: s.key,
            type: s.type,
            content: s.content,
            next_step: s.next_step,
            metadata: s.metadata || {},
          })),
        });
      }

      return tx.flow.findUnique({ where: { id: flow.id }, include: { steps: true } });
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      is_active?: boolean;
      steps?: unknown[];
      entry_mode?: string;
      entry_step_key?: string | null;
      priority?: number;
      trigger_keywords?: unknown;
      trigger_intents?: unknown;
      entry_events?: unknown;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const patch: Record<string, unknown> = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.is_active !== undefined) patch.is_active = data.is_active;
      if (data.entry_mode !== undefined) patch.entry_mode = data.entry_mode;
      if (data.entry_step_key !== undefined) patch.entry_step_key = data.entry_step_key;
      if (data.priority !== undefined) patch.priority = data.priority;
      if (data.trigger_keywords !== undefined) patch.trigger_keywords = data.trigger_keywords as object;
      if (data.trigger_intents !== undefined) patch.trigger_intents = data.trigger_intents as object;
      if (data.entry_events !== undefined) patch.entry_events = data.entry_events as object;

      if (Object.keys(patch).length > 0) {
        await tx.flow.update({
          where: { id },
          data: patch as any,
        });
      }

      if (data.steps) {
        await tx.flowStep.deleteMany({ where: { flow_id: id } });
        await tx.flowStep.createMany({
          data: data.steps.map((s: any) => ({
            flow_id: id,
            key: s.key,
            type: s.type,
            content: s.content,
            next_step: s.next_step,
            metadata: s.metadata || {},
          })),
        });
      }

      return tx.flow.findUnique({ where: { id }, include: { steps: true } });
    });
  }

  static async delete(id: string) {
    return prisma.Flow.delete({ where: { id } });
  }
}
