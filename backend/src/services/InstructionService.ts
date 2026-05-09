import { prisma } from '../lib/prisma.js';

export class InstructionService {
  static async getByUser(userId: string) {
    return prisma.UserInstruction.findFirst({
      where: { user_id: userId },
    });
  }

  static async upsertByUser(userId: string, content: string, isActive = true) {
    if (!content) {
      throw new Error('invalid_input');
    }

    const existing = await prisma.UserInstruction.findFirst({
      where: { user_id: userId },
    });

    if (existing) {
      return prisma.UserInstruction.update({
        where: { id: existing.id },
        data: { content, is_active: isActive },
      });
    }

    return prisma.UserInstruction.create({
      data: {
        user_id: userId,
        content,
        is_active: isActive,
      },
    });
  }
}
