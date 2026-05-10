import type { Agent, Flow, FlowStep } from '@prisma/client';

export type FlowCtx = Record<string, unknown>;

export type FlowWithRelations = Flow & {
  agent: Agent;
  steps: FlowStep[];
};

export type OutboundText = {
  kind: 'text';
  text: string;
  delayMs?: number;
};

export type OutboundMessage = OutboundText;

export type FlowProcessResult = {
  outbound: OutboundMessage[];
  /** Reservado; o motor não pausa mais o fluxo em etapas de botão. */
  flowResume: { flowId: string; stepKey: string } | null;
};
