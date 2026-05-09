import type { WebhookInboundJob } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type JobProcessor = (job: WebhookInboundJob) => Promise<void>;

/**
 * Processa fila `webhook_inbound_job` (PostgreSQL). Um único ciclo evita corridas sem SKIP LOCKED.
 */
export class WebhookQueueWorker {
  private static processor: JobProcessor | null = null;
  private static pollMs = Number(process.env.WEBHOOK_QUEUE_POLL_MS) || 4000;
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static draining = false;
  private static started = false;

  static configure(processJob: JobProcessor) {
    this.processor = processJob;
  }

  static start() {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => {
      void this.drainPending();
    }, this.pollMs);
    void this.drainPending();
  }

  static stop() {
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Chamado após enfileirar no webhook para não esperar só pelo poll. */
  static notifyNewJob() {
    void this.drainPending();
  }

  private static async drainPending() {
    if (this.draining || !this.processor) return;
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

    const locked = await prisma.webhookInboundJob.updateMany({
      where: { id: candidate.id, status: 'pending' },
      data: { status: 'processing', attempt_count: { increment: 1 } },
    });
    if (locked.count === 0) return true;

    const job = await prisma.webhookInboundJob.findUniqueOrThrow({
      where: { id: candidate.id },
    });

    try {
      await this.processor(job);
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: { status: 'completed', processed_at: new Date(), last_error: null },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          processed_at: new Date(),
          last_error: msg.slice(0, 2000),
        },
      });
      console.error('[WebhookQueueWorker] job falhou:', job.id, msg);
    }

    return true;
  }
}
