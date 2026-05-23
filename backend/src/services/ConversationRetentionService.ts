import { conversationRetentionDays } from '../lib/conversationPolicy.js';
import { prismaRaw } from '../lib/prisma.js';

export class ConversationRetentionService {
  static cutoffDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - conversationRetentionDays());
    return d;
  }

  /** Remove conversas sem actividade há mais de N dias (por `updated_at`). */
  static async purgeExpired(): Promise<number> {
    const result = await prismaRaw.conversation.deleteMany({
      where: { updated_at: { lt: this.cutoffDate() } },
    });
    return result.count;
  }
}
