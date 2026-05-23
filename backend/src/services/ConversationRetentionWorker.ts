import { conversationRetentionDays } from '../lib/conversationPolicy.js';
import { ConversationRetentionService } from './ConversationRetentionService.js';

const INTERVAL_MS = 6 * 60 * 60 * 1000;

export class ConversationRetentionWorker {
  private static timer: ReturnType<typeof setInterval> | null = null;

  static start(): void {
    void this.run();
    this.timer = setInterval(() => void this.run(), INTERVAL_MS);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static async run(): Promise<void> {
    try {
      const removed = await ConversationRetentionService.purgeExpired();
      if (removed > 0) {
        console.log(
          `[conversation-retention] ${removed} conversa(s) removida(s) (>${conversationRetentionDays()} dias)`,
        );
      }
    } catch (err: unknown) {
      console.warn(
        '[conversation-retention] falha na limpeza:',
        err instanceof Error ? err.message : err,
      );
    }
  }
}
