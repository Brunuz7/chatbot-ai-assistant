import type { Agent, Flow } from '@prisma/client';
import type { FlowWithRelations, OutboundMessage } from './flowTypes.js';

export type FlowResolved = FlowWithRelations;

export type InboundFlowParams = {
  flow: FlowWithRelations;
  agent: Agent | null;
  userId: string;
  incomingText: string;
  whatsappId: string;
  outbound: OutboundMessage[];
  loadFlow: (flowId: string) => Promise<FlowWithRelations | null>;
};

export type InboundFlowRunResult = {
  loop: 'continue' | 'break';
  nextFlowId: string | null;
  inboundForWait: string;
};

export type InboundFlowHandler = (params: InboundFlowParams) => Promise<InboundFlowRunResult>;
