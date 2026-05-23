export interface FlowRecord {
  id: string;
  name: string;
  agent_id: string;
  is_active: boolean;
  entry_mode?: string;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  type?: string;
  content?: string | null;
  next_flow_id?: string | null;
  metadata?: Record<string, unknown>;
  agent?: { name: string };
  steps?: Array<{
    type: string;
    content?: string;
    next_step?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export type FlowFormState = {
  name: string;
  agent_id: string;
  is_active: boolean;
  entry_mode: string;
  priority: number;
  intentsStr: string;
  type: string;
  content: string;
  next_flow_id: string;
  metadata: Record<string, unknown>;
};

export const EMPTY_FLOW_FORM: FlowFormState = {
  name: '',
  agent_id: '',
  is_active: true,
  entry_mode: 'trigger',
  priority: 0,
  intentsStr: '',
  type: 'send_message',
  content: '',
  next_flow_id: '',
  metadata: {},
};

export function parseTriggerList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function triggerArrayToString(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return v.filter((x) => typeof x === 'string').join(', ');
}

function flowTypeFromLegacy(flow: FlowRecord): string {
  if (flow.type) return flow.type;
  const first = flow.steps?.[0];
  if (!first) return 'interpret';
  if (first.type === 'interactive_buttons') return 'send_message';
  if (first.type === 'set_state') return 'goto';
  return first.type;
}

export function flowToFormState(flow: FlowRecord): FlowFormState {
  const first = flow.steps?.[0];
  const meta = { ...(flow.metadata || {}), ...(first?.metadata || {}) } as Record<string, unknown>;
  let type = flowTypeFromLegacy(flow);
  let content = flow.content ?? first?.content ?? '';
  let next_flow_id = flow.next_flow_id ?? '';

  if (first?.type === 'interactive_buttons') {
    const title = (meta.title as string) || content || 'Escolha uma opção';
    const buttons = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
    const lines = buttons.map((b) => `• ${String(b.displayText || b.id || '').trim()}`).filter((l) => l.length > 2);
    content = lines.length > 0 ? `${title}\n\n${lines.join('\n')}` : title;
    meta.buttons = undefined;
    meta.title = undefined;
  }

  if (first?.type === 'set_state' || type === 'goto') {
    type = 'goto';
    const target = String(meta.target_flow_id ?? meta.target_step ?? first?.next_step ?? '').trim();
    if (target) next_flow_id = target;
  }

  if (meta.true_step && !meta.true_flow_id) meta.true_flow_id = meta.true_step;
  if (meta.false_step && !meta.false_flow_id) meta.false_flow_id = meta.false_step;
  if (meta.target_step && !meta.target_flow_id) meta.target_flow_id = meta.target_step;

  return {
    name: flow.name,
    agent_id: flow.agent_id,
    is_active: flow.is_active,
    entry_mode: flow.entry_mode || 'always_idle',
    priority: flow.priority ?? 0,
    intentsStr: triggerArrayToString(flow.trigger_intents),
    type,
    content,
    next_flow_id,
    metadata: meta,
  };
}

export function formStateToPayload(formData: FlowFormState, isEdit: boolean) {
  return {
    name: formData.name,
    agent_id: formData.agent_id,
    is_active: isEdit ? formData.is_active : true,
    entry_mode: formData.entry_mode,
    priority: Number(formData.priority) || 0,
    trigger_keywords: [],
    trigger_intents: formData.entry_mode === 'trigger' ? parseTriggerList(formData.intentsStr) : [],
    entry_events: [],
    type: formData.type,
    content: formData.content || null,
    next_flow_id: formData.next_flow_id.trim() || null,
    metadata: formData.metadata,
  };
}
