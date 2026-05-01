import { prisma } from '../lib/prisma.js';

export class InstructionService {
  static async getByUser(userId: string) {
    return prisma.user_instruction.findFirst({
      where: { user_id: userId },
    });
  }

  static async upsertByUser(userId: string, content: string, isActive = true) {
    if (!content) {
      throw new Error('invalid_input');
    }

    const existing = await prisma.user_instruction.findFirst({
      where: { user_id: userId },
    });

    if (existing) {
      return prisma.user_instruction.update({
        where: { id: existing.id },
        data: { content, is_active: isActive },
      });
    }

    return prisma.user_instruction.create({
      data: {
        user_id: userId,
        content,
        is_active: isActive,
      },
    });
  }
}
