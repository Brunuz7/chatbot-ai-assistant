import { prisma } from '../lib/prisma.js';

export class InstructionService {
  static async getByUser(userId: string) {
    return prisma.userInstruction.findFirst({
      where: { user_id: userId },
    });
  }

  /** Todas as instruções globais activas da conta (mais recentes primeiro). */
  static async listActiveByUser(userId: string) {
    return prisma.userInstruction.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: { updated_at: 'desc' },
      select: { content: true },
    });
  }

  static async upsertByUser(userId: string, content: string, isActive = true) {
    if (!content) {
      throw new Error('invalid_input');
    }

    const existing = await prisma.userInstruction.findFirst({
      where: { user_id: userId },
    });

    if (existing) {
      return prisma.userInstruction.update({
        where: { id: existing.id },
        data: { content, is_active: isActive },
      });
    }

    return prisma.userInstruction.create({
      data: {
        user_id: userId,
        content,
        is_active: isActive,
      },
    });
  }
}
