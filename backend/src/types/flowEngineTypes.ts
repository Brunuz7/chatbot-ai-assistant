import type { Agent, FlowStep } from '@prisma/client';
import type { FlowWithRelations, OutboundMessage } from './flowTypes.js';

export type FlowResolved = FlowWithRelations;

export type InboundStepParams = {
  step: FlowStep;
  flow: FlowWithRelations;
  agent: Agent;
  incomingText: string;
  outbound: OutboundMessage[];
};

export type InboundStepRunResult = {
  loop: 'continue' | 'break';
  stepKey: string | null;
  inboundForWait: string;
};

export type InboundStepHandler = (params: InboundStepParams) => Promise<InboundStepRunResult>;
