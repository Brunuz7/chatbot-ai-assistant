import { prismaRaw } from '../prisma.js';
import { conversationConfig } from '../config/conversation.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';

export class ConversationRetention {
  private static timer: ReturnType<typeof setInterval> | null = null;

  static retentionCutoffDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - conversationConfig.retentionDays);
    return d;
  }

  static async purgeExpired(): Promise<number> {
    const result = await prismaRaw.conversation.deleteMany({
      where: { updated_at: { lt: this.retentionCutoffDate() } },
    });
    return result.count;
  }

  static start(): void {
    void this.purgeExpired();
    this.timer = setInterval(() => void this.run(), conversationConfig.retentionPollMs);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static async run(): Promise<void> {
    try {
      const removed = await this.purgeExpired();
      if (removed > 0) {
        console.log(
          `[conversation-retention] ${removed} conversa(s) removida(s) (>${conversationConfig.retentionDays} dias)`,
        );
      }
    } catch (err: unknown) {
      console.warn('[conversation-retention] falha na limpeza:', getErrorMessage(err));
    }
  }
}
