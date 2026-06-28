import type { WebhookInboundJob } from '@prisma/client';
import { prisma } from '../prisma.js';
import { inboundTrace } from './inboundTrace.js';

export const INBOUND_DEBOUNCE_MS = Number(process.env.INBOUND_DEBOUNCE_MS) || 2500;
const DEBOUNCE_POLL_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForContactDebounce(connectionId: string, remoteJid: string): Promise<void> {
  while (true) {
    const latest = await prisma.webhookInboundJob.findFirst({
      where: {
        connection_id: connectionId,
        remote_jid: remoteJid,
        status: 'pending',
      },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    if (!latest) return;

    const elapsed = Date.now() - latest.created_at.getTime();
    if (elapsed >= INBOUND_DEBOUNCE_MS) {
      inboundTrace('debounce.concluido', {
        connectionId,
        remoteJid,
        debounceMs: INBOUND_DEBOUNCE_MS,
      });
      return;
    }

    await sleep(Math.min(DEBOUNCE_POLL_MS, INBOUND_DEBOUNCE_MS - elapsed));
  }
}

export async function collectPendingContactBatch(
  connectionId: string,
  remoteJid: string,
): Promise<WebhookInboundJob[]> {
  return prisma.webhookInboundJob.findMany({
    where: {
      connection_id: connectionId,
      remote_jid: remoteJid,
      status: 'pending',
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function supersedePendingJobs(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;

  const result = await prisma.webhookInboundJob.updateMany({
    where: { id: { in: jobIds }, status: 'pending' },
    data: { status: 'superseded', processed_at: new Date(), last_error: null },
  });

  return result.count;
}
