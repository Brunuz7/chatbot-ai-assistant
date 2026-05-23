import { prisma } from './prisma.js';

/** Há mensagem mais recente do mesmo contacto ainda na fila — este job deve ser ignorado. */
export async function hasNewerPendingInboundJob(params: {
  connectionId: string;
  remoteJid: string;
  createdAt: Date;
}): Promise<boolean> {
  const newer = await prisma.webhookInboundJob.findFirst({
    where: {
      connection_id: params.connectionId,
      remote_jid: params.remoteJid,
      status: 'pending',
      created_at: { gt: params.createdAt },
    },
    select: { id: true },
  });
  return newer !== null;
}
