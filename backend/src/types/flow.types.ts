export type FlowCtx = Record<string, unknown>;

export type FlowStepRow = {
  key: string;
  type: string;
  content: string | null;
  next_step: string | null;
  metadata: unknown;
};

export type FlowRow = {
  id: string;
  is_active: boolean;
  entry_mode: string;
  priority: number;
  entry_step_key: string | null;
  trigger_keywords: unknown;
  trigger_intents: unknown;
  entry_events: unknown;
  steps: FlowStepRow[];
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
};
