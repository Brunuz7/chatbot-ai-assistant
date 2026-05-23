import type { WebhookInboundJob } from '@prisma/client';
import { inboundTrace } from '../lib/inboundTrace.js';
import { prisma } from '../lib/prisma.js';
import { hasNewerPendingInboundJob } from '../lib/webhookInboundCoalesce.js';

export type WebhookJobProcessOutcome = 'processed' | 'superseded';

type JobProcessor = (job: WebhookInboundJob) => Promise<WebhookJobProcessOutcome>;

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

    inboundTrace('worker.processando', {
      jobId: job.id,
      attempt: job.attempt_count,
      remoteJid: job.remote_jid,
    });

    const superseded = await hasNewerPendingInboundJob({
      connectionId: job.connection_id,
      remoteJid: job.remote_jid,
      createdAt: job.created_at,
    });
    if (superseded) {
      inboundTrace('worker.superseded', { jobId: job.id });
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: { status: 'superseded', processed_at: new Date(), last_error: null },
      });
      return true;
    }

    try {
      const outcome = await this.processor(job);
      inboundTrace('worker.concluido', { jobId: job.id, outcome });
      await prisma.webhookInboundJob.update({
        where: { id: job.id },
        data: {
          status: outcome === 'superseded' ? 'superseded' : 'completed',
          processed_at: new Date(),
          last_error: null,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      inboundTrace('worker.erro', { jobId: job.id, error: msg });
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
