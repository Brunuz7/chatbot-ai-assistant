export type InboundJobProcessOutcome = 'processed' | 'superseded';

export type EnqueueInboundParams = {
  connection: import('@prisma/client').Connection;
  instanceName: string;
  remoteJid: string;
  eventNormalized: string;
  inboundKind: string;
  payload: Record<string, unknown>;
  traceLabel: 'evolution' | 'meta';
};
