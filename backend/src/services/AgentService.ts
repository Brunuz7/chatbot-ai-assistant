import { prisma } from '../lib/prisma.js';

export class AgentService {
  static async list(userId: string) {
    return prisma.Agent.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  static async getById(id: string, userId: string) {
    return prisma.Agent.findFirst({
      where: { id, user_id: userId },
      include: { flows: true }
    });
  }

  static async create(userId: string, data: { name: string, role: string, objective: string, instructions: string }) {
    return prisma.Agent.create({
      data: {
        ...data,
        user_id: userId,
      }
    });
  }

  static async update(id: string, userId: string, data: any) {
    const agent = await prisma.Agent.findFirst({ where: { id, user_id: userId } });
    if (!agent) throw new Error('Agent not found');

    return prisma.Agent.update({
      where: { id },
      data
    });
  }

  static async delete(id: string, userId: string) {
    const agent = await prisma.Agent.findFirst({ where: { id, user_id: userId } });
    if (!agent) throw new Error('Agent not found');

    return prisma.Agent.delete({ where: { id } });
  }
}
