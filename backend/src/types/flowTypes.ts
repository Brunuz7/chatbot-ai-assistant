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

export type OutboundButtons = {
  kind: 'buttons';
  title: string;
  description?: string;
  footer?: string;
  buttons: { id: string; type: 'reply'; displayText: string }[];
  delayMs?: number;
};

export type OutboundMessage = OutboundText | OutboundButtons;

export type FlowProcessResult = {
  outbound: OutboundMessage[];
  /** null = fluxo não está pausado; definido quando aguardando resposta após botões */
  flowResume: { flowId: string; stepKey: string } | null;
};
