import { prisma } from '../lib/prisma.js';

export class InstructionService {
  static async getByUser(userId: string) {
    return prisma.user_instruction.findUnique({
      where: { user_id: userId },
    });
  }

  static async upsertByUser(userId: string, content: string, isActive = true) {
    if (!content) {
      throw new Error('invalid_input');
    }

    return prisma.user_instruction.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        content,
        is_active: isActive,
      },
      update: {
        content,
        is_active: isActive,
      },
    });
  }
}

export default InstructionService;
