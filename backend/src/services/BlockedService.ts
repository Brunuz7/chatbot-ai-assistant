import { prisma } from '../lib/prisma.js';

export class BlockedService {
  static async listBlocked(userId: string) {
    return prisma.UserContact.findMany({
      where: { blocked: true, user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  static async blockContact(userId: string, phoneNumber: string, observation?: string) {
    const exists = await prisma.UserContact.findFirst({
      where: { phone_number: phoneNumber, user_id: userId },
    });

    if (exists?.blocked) {
      throw new Error('already_blocked');
    }

    if (exists) {
      return prisma.UserContact.update({
        where: { id: exists.id },
        data: { blocked: true, observation },
      });
    }

    return prisma.UserContact.create({
      data: {
        phone_number: phoneNumber,
        observation,
        blocked: true,
        user_id: userId,
      },
    });
  }

  static async unblockContact(userId: string, contactId: string) {
    const contact = await prisma.UserContact.findFirst({
      where: { id: contactId, user_id: userId },
    });
    if (!contact) {
      throw new Error('not_found');
    }

    return prisma.UserContact.update({
      where: { id: contactId },
      data: { blocked: false },
    });
  }
}
