import { prisma } from '../prisma.js';
import type { InboundJobProcessOutcome } from '../types/inboundMessage.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import {
  collectPendingContactBatch,
  supersedePendingJobs,
  waitForContactDebounce,
} from '../utils/inboundJobBatch.js';
import { InboundMessageService } from './InboundMessageService.js';

export class InboundMessageWorker {
  private static pollMs = Number(process.env.WEBHOOK_QUEUE_POLL_MS) || 4000;
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static draining = false;
  private static started = false;

  static start(): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => void this.drain(), this.pollMs);
    void this.drain();
  }

  static stop(): void {
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  static notify(): void {
    void this.drain();
  }

  private static async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (await this.processNext()) {
        /* sequencial */
      }
    } finally {
      this.draining = false;
    }
  }

  private static async processNext(): Promise<boolean> {
    const candidate = await prisma.webhookInboundJob.findFirst({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
    });
    if (!candidate) return false;

    await waitForContactDebounce(candidate.connection_id, candidate.remote_jid);

    const batch = await collectPendingContactBatch(candidate.connection_id, candidate.remote_jid);
    if (batch.length === 0) return true;

    const anchor = batch[batch.length - 1];
    const supersededIds = batch.slice(0, -1).map((job) => job.id);

    if (supersededIds.length > 0) {
      const supersededCount = await supersedePendingJobs(supersededIds);
    }

    const locked = await prisma.webhookInboundJob.updateMany({
      where: { id: anchor.id, status: 'pending' },
      data: { status: 'processing', attempt_count: { increment: 1 } },
    });
    if (locked.count === 0) return true;

    const job = await prisma.webhookInboundJob.findUniqueOrThrow({ where: { id: anchor.id } });

    try {
      const outcome: InboundJobProcessOutcome = await InboundMessageService.processJob(job, { batchJobs: batch });

      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: outcome === 'superseded' ? 'superseded' : 'completed',
          processed_at: new Date(),
          last_error: null,
        },
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);

      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          processed_at: new Date(),
          last_error: msg.slice(0, 2000),
        },
      });
    }

    return true;
  }
}
