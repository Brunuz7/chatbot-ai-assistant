import type { Agent, Flow } from '@prisma/client';

export type FlowCtx = Record<string, unknown>;

export type FlowWithRelations = Flow & {
  agent: Agent;
};

export type OutboundText = {
  kind: 'text';
  text: string;
  delayMs?: number;
  /** Fluxo pediu entrega em áudio (TTS), independente do modo global. */
  forceAudio?: boolean;
};

export type OutboundMessage = OutboundText;

export type FlowProcessResult = {
  outbound: OutboundMessage[];
  /** Fluxo em pausa aguardando resposta (ex.: wait_reply). */
  flowResume: { flowId: string } | null;
};
