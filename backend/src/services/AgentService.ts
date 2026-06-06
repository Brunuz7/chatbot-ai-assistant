import { includeFlowsActive, prisma } from '../prisma.js';

export class AgentService {
  static async list(userId: string) {
    return prisma.agent.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' } });
  }

  static async getById(id: string, userId: string) {
    return prisma.agent.findFirst({
      where: { id, user_id: userId },
      include: { flows: includeFlowsActive },
    });
  }

  static async create(userId: string, data: { name: string; role: string; objective: string; instructions: string }) {
    return prisma.agent.create({ data: { ...data, user_id: userId } });
  }

  static async update(id: string, userId: string, data: any) {
    const agent = await prisma.agent.findFirst({ where: { id, user_id: userId } });
    if (!agent) throw new Error('Agent not found');
    return prisma.agent.update({ where: { id }, data });
  }

  static async delete(id: string, userId: string) {
    const agent = await prisma.agent.findFirst({ where: { id, user_id: userId } });
    if (!agent) throw new Error('Agent not found');

    const flows = await prisma.flow.findMany({ where: { agent_id: id }, select: { id: true } });
    const flowIds = flows.map((f) => f.id);

    await prisma.$transaction([
      prisma.flow.updateMany({ where: { next_flow_id: { in: flowIds } }, data: { next_flow_id: null } }),
      prisma.flow.deleteMany({ where: { agent_id: id } }),
      prisma.agent.delete({ where: { id } }),
    ]);

    return { id };
  }
}
