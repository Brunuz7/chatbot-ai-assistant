import { prisma } from '../lib/prisma.js';
import type { FlowCtx, FlowProcessResult, FlowRow, FlowStepRow, OutboundMessage } from '../types/flow.types.js';

type InboundStepEnv = {
  conversationId: string;
  flow: FlowRow;
  agent: { instructions: string; role: string; objective: string };
  incomingText: string;
  outbound: OutboundMessage[];
};

type InboundStepRunResult = {
  loop: 'continue' | 'break';
  stepKey: string | null;
  ctx: FlowCtx;
  inboundForWait: string;
};

export class FlowEngineService {
  private static readonly MAX_STEPS = 40;

  private static textReply(text: string, delayMs = 1200): FlowProcessResult {
    return { outbound: [{ kind: 'text', text, delayMs }] };
  }

  private static parseJsonStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  }

  private static interpolate(template: string | null | undefined, ctx: FlowCtx): string {
    if (!template) return '';
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
      const parts = key.split('.');
      let cur: unknown = ctx;
      for (const p of parts) {
        if (cur === null || cur === undefined || typeof cur !== 'object') return '';
        cur = (cur as FlowCtx)[p];
      }
      return cur === undefined || cur === null ? '' : String(cur);
    });
  }

  private static normalizeEvent(ev: string | undefined | null): string | null {
    if (!ev) return null;
    return String(ev).trim().toLowerCase().replace(/_/g, '.');
  }

  private static matchesTriggerFlow(flow: Pick<FlowRow, 'trigger_keywords' | 'trigger_intents' | 'entry_events'>, text: string, webhookEvent: string | null): boolean {
    const keywords = this.parseJsonStringArray(flow.trigger_keywords);
    const intents = this.parseJsonStringArray(flow.trigger_intents);
    const events = this.parseJsonStringArray(flow.entry_events);
    const t = text.trim().toLowerCase();

    if (webhookEvent && events.includes(webhookEvent)) return true;
    if (keywords.some((k) => t.includes(k.toLowerCase()))) return true;
    if (intents.some((i) => t.includes(i.toLowerCase()))) return true;
    return false;
  }

  private static selectFlowToStart(flows: FlowRow[], text: string, webhookEvent: string | null): FlowRow | null {
    const active = flows.filter((f) => f.is_active).sort((a, b) => b.priority - a.priority);

    const matchedTrigger = active
      .filter((f) => f.entry_mode === 'trigger')
      .find((f) => this.matchesTriggerFlow(f, text, webhookEvent));
    if (matchedTrigger) return matchedTrigger;

    const idle = active.filter((f) => f.entry_mode === 'always_idle');
    if (idle.length) return idle[0];

    return null;
  }

  private static findInterruptingTriggerFlow(flows: FlowRow[], text: string, webhookEvent: string | null): FlowRow | null {
    const candidates = flows.filter((f) => f.is_active && f.entry_mode === 'trigger').sort((a, b) => b.priority - a.priority);
    return candidates.find((f) => this.matchesTriggerFlow(f, text, webhookEvent)) || null;
  }

  private static stepsByKey(steps: FlowStepRow[]) {
    const m = new Map<string, FlowStepRow>();
    for (const s of steps) m.set(s.key, s);
    return m;
  }

  private static entryStepKey(flow: Pick<FlowRow, 'entry_step_key' | 'steps'>): string | null {
    if (flow.entry_step_key) return flow.entry_step_key;
    const start = flow.steps.find((s) => s.key === 'start' || s.type === 'start');
    if (start) return start.key;
    return flow.steps[0]?.key ?? null;
  }

  private static async freeTextInterpret(agent: { instructions: string; role: string; objective: string }, userText: string, meta: FlowCtx): Promise<FlowCtx> {
    const OpenRouterModule = await import('@openrouter/sdk');
    const _openRouterAny = OpenRouterModule as any;
    const OpenRouter: any = _openRouterAny.OpenRouter ?? _openRouterAny.default ?? _openRouterAny;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) return { _interpret_error: 'OPENROUTER_API_KEY missing' };

    const instruction =
      (meta.extract_instruction as string) ||
      (meta.prompt as string) ||
      'Extract useful structured fields from the user message as JSON keys. Use lowercase snake_case keys.';

    const client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
    const systemPrompt = `You only output raw JSON (no markdown). Merge factual extractions from the user message.\nContext: role=${agent.role}, objective=${agent.objective}.\nTask: ${instruction}`;

    try {
      const resp = await client.chat.send({
        model: process.env.OPENROUTER_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }],
        temperature: 0.1,
        max_tokens: 400,
      } as any);

      const data = resp as any;
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== 'string') return {};

      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as FlowCtx) : {};
    } catch {
      return { _interpret_error: 'parse_failed' };
    }
  }

  private static async conversationalFallback(agent: { instructions: string; role: string; objective: string }, userText: string): Promise<string | null> {
    const OpenRouterModule = await import('@openrouter/sdk');
    const _openRouterAny = OpenRouterModule as any;
    const OpenRouter: any = _openRouterAny.OpenRouter ?? _openRouterAny.default ?? _openRouterAny;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) return 'Serviço de IA não configurado.';

    try {
      const client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
      const systemPrompt = `Role: ${agent.role}\nObjective: ${agent.objective}\nInstructions: ${agent.instructions}\n\nYou answer user messages naturally. You do NOT control multi-step business flows; you only chat.`;

      const resp = await client.chat.send({
        model: process.env.OPENROUTER_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        temperature: 0.2,
        max_tokens: 512,
      } as any);

      const data = resp as any;
      return data?.choices?.[0]?.message?.content ?? null;
    } catch {
      return 'Não foi possível responder agora. Tente novamente.';
    }
  }

  private static stepTypeOf(raw: string): string {
    const t = raw.trim().toLowerCase();
    const map: Record<string, string> = {
      message: 'send_message',
      sendmessage: 'send_message',
      send_message: 'send_message',
      buttons: 'interactive_buttons',
      interactive_buttons: 'interactive_buttons',
      input: 'wait_reply',
      wait_reply: 'wait_reply',
      waitreply: 'wait_reply',
      setstate: 'set_state',
      set_state: 'set_state',
      goto: 'goto',
      jump: 'goto',
      condition: 'condition',
      handover: 'handover',
      interpret: 'interpret',
      interpret_free_text: 'interpret',
      free_text_ai: 'interpret',
      ai: 'interpret',
      start: 'start',
    };
    return map[t] || t;
  }

  private static stripRuntimeKeys(ctx: FlowCtx): FlowCtx {
    const next = { ...ctx };
    delete next.awaiting_buttons;
    delete next.__flow_skip_wait_once;
    return next;
  }

  private static async reloadConversation(whatsappId: string) {
    return prisma.conversation.findUnique({
      where: { whatsapp_id: whatsappId },
      include: {
        agent: { include: { flows: { where: { is_active: true }, include: { steps: true } } } },
        active_flow: { include: { steps: true } },
      },
    });
  }

  private static inboundStepStart(step: FlowStepRow, ctx: FlowCtx, inboundForWait: string): InboundStepRunResult {
    const next = step.next_step || null;
    if (!next) return { loop: 'break', stepKey: null, ctx, inboundForWait };
    return { loop: 'continue', stepKey: next, ctx, inboundForWait };
  }

  private static async inboundStepSendMessage(
    step: FlowStepRow,
    meta: FlowCtx,
    env: InboundStepEnv,
    ctx: FlowCtx,
    inboundForWait: string,
  ): Promise<InboundStepRunResult> {
    const text = this.interpolate(step.content, ctx);
    if (text) env.outbound.push({ kind: 'text', text, delayMs: (meta.delay as number) || 1200 });
    const next = step.next_step ?? null;
    if (!next) {
      const stripped = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({
        where: { id: env.conversationId },
        data: { active_flow_id: null, current_step: null, context: stripped as object },
      });
      return { loop: 'break', stepKey: null, ctx: stripped, inboundForWait };
    }
    await prisma.conversation.update({
      where: { id: env.conversationId },
      data: { current_step: next, context: ctx as object },
    });
    return { loop: 'continue', stepKey: next, ctx, inboundForWait };
  }

  private static async inboundStepInteractiveButtons(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const title = this.interpolate((meta.title as string) || step.content || 'Escolha uma opção', ctx);
    const description = meta.description ? this.interpolate(String(meta.description), ctx) : undefined;
    const footer = meta.footer ? this.interpolate(String(meta.footer), ctx) : undefined;
    const buttonsRaw = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
    const targets = (meta.button_targets as Record<string, string>) || {};
    const routing: Record<string, string> = {};

    const buttons = buttonsRaw.slice(0, 3).map((b) => {
      const id = String(b.id ?? b.displayText ?? '').trim().slice(0, 256);
      const displayText = String(b.displayText ?? b.id ?? '').trim().slice(0, 20);
      const dest = targets[id] || targets[displayText] || step.next_step || '';

      if (id && dest) {
        routing[id] = dest;
        routing[id.toLowerCase()] = dest;
      }

      if (displayText && dest) {
        routing[displayText] = dest;
        routing[displayText.toLowerCase()] = dest;
      }

      return { id: id || displayText, type: 'reply' as const, displayText: displayText || id };
    });

    // Se o utilizador não definiu destino por botão mas há "Próxima etapa" na etapa, usa-se para todos.
    if (buttons.length > 0 && Object.keys(routing).length === 0 && step.next_step) {
      for (const b of buttons) {
        const dest = step.next_step!;
        if (b.id) {
          routing[b.id] = dest;
          routing[b.id.toLowerCase()] = dest;
        }
        if (b.displayText) {
          routing[b.displayText] = dest;
          routing[b.displayText.toLowerCase()] = dest;
        }
      }
    }

    const usableButtons = buttons.filter((b) => (b.displayText || b.id).trim().length > 0);

    if (usableButtons.length === 0) {
      env.outbound.push({ kind: 'text', text: title || 'Configure pelo menos um botão com texto.', delayMs: 1200 });
    } else if (Object.keys(routing).length === 0) {
      env.outbound.push({
        kind: 'text',
        text:
          `${title}\n\n` +
          'Defina em cada botão o campo "Ir para etapa" ou escolha "Próxima etapa" nesta etapa para enviar botões no WhatsApp.',
        delayMs: 1200,
      });
    } else {
      ctx.awaiting_buttons = { routing };
      env.outbound.push({
        kind: 'buttons',
        title: title || 'Escolha uma opção',
        description,
        footer,
        buttons: usableButtons,
        delayMs: (meta.delay as number) || 1200,
      });
    }

    await prisma.conversation.update({
      where: { id: env.conversationId },
      data: { current_step: step.key, context: ctx as object, active_flow_id: env.flow.id },
    });

    return { loop: 'break', stepKey: step.key, ctx, inboundForWait };
  }

  private static async inboundStepSetState(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const patch = (meta.patch as FlowCtx) || (meta.assignments as FlowCtx) || {};
    let nextCtx = { ...ctx, ...patch };
    const next = step.next_step ?? null;

    if (!next) {
      nextCtx = this.stripRuntimeKeys(nextCtx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: nextCtx as object } });
      return { loop: 'break', stepKey: null, ctx: nextCtx, inboundForWait };
    }
    
    await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: next, context: nextCtx as object } });
    
    return { loop: 'continue', stepKey: next, ctx: nextCtx, inboundForWait };
  }

  private static async inboundStepGoto(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const target = ((meta.target_step as string) || (meta.target as string) || step.next_step) ?? null;
    
    if (!target) {
      const stripped = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: stripped as object } });
      return { loop: 'break', stepKey: null, ctx: stripped, inboundForWait };
    }

    await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: target, context: ctx as object } });
    
    return { loop: 'continue', stepKey: target, ctx, inboundForWait };
  }

  private static async inboundStepWaitReply(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const variable = (meta.variable as string) || 'last_reply';
    const ask = this.interpolate(step.content, ctx);
    
    if (ctx.__flow_skip_wait_once) {
      delete ctx.__flow_skip_wait_once;
      if (ask) env.outbound.push({ kind: 'text', text: ask, delayMs: (meta.delay as number) || 1200 });
      
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: step.key, context: ctx as object, active_flow_id: env.flow.id } });
      return { loop: 'break', stepKey: step.key, ctx, inboundForWait };
    }

    ctx[variable] = inboundForWait;
    const nextInbound = '';
    const next = step.next_step ?? null;

    if (!next) {
      let nextCtx = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: nextCtx as object } });
      return { loop: 'break', stepKey: null, ctx: nextCtx, inboundForWait: nextInbound };
    }

    await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: next, context: ctx as object } });
    
    return { loop: 'continue', stepKey: next, ctx, inboundForWait: nextInbound };
  }

  private static async inboundStepInterpret(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const extracted = await this.freeTextInterpret(env.agent, inboundForWait || env.incomingText, meta);
    let nextCtx = { ...ctx, ...extracted };
    const next = step.next_step ?? null;

    if (!next) {
      nextCtx = this.stripRuntimeKeys(nextCtx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: nextCtx as object } });
      return { loop: 'break', stepKey: null, ctx: nextCtx, inboundForWait };
    }

    await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: next, context: nextCtx as object } });
    return { loop: 'continue', stepKey: next, ctx: nextCtx, inboundForWait };
  }

  private static async inboundStepCondition(step: FlowStepRow, meta: FlowCtx, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const variable = meta.variable as string | undefined;
    const val = variable ? ctx[variable] : undefined;
    let conditionMet = false;
    
    if (meta.operator && meta.variable !== undefined && meta.value !== undefined) {
      const cmp = meta.value;
      if (meta.operator === 'equals' && val == cmp) conditionMet = true;
      if (meta.operator === 'contains' && String(val ?? '').toLowerCase().includes(String(cmp).toLowerCase()))
        conditionMet = true;
    }

    const branchKey = conditionMet ? (meta.true_step as string) || step.next_step
      : (meta.false_step as string) || step.next_step;

    if (!branchKey) {
      const stripped = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: stripped as object } });
      return { loop: 'break', stepKey: null, ctx: stripped, inboundForWait };
    }
    
    await prisma.conversation.update({ where: { id: env.conversationId }, data: { current_step: branchKey, context: ctx as object } });
    return { loop: 'continue', stepKey: branchKey, ctx, inboundForWait };
  }

  private static async inboundStepHandover(step: FlowStepRow, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    env.outbound.push({ kind: 'text', text: step.content || 'Um atendente humano dará continuidade em instantes.', delayMs: 1200 });
    const stripped = this.stripRuntimeKeys(ctx);
    await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: stripped as object } });
    return { loop: 'break', stepKey: null, ctx: stripped, inboundForWait };
  }

  private static async inboundStepUnknown(step: FlowStepRow, env: InboundStepEnv, ctx: FlowCtx, inboundForWait: string): Promise<InboundStepRunResult> {
    const next = step.next_step ?? null;
    
    if (!next) {
      const stripped = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({ where: { id: env.conversationId }, data: { active_flow_id: null, current_step: null, context: stripped as object } });
      return { loop: 'break', stepKey: null, ctx: stripped, inboundForWait };
    }

    await prisma.conversation.update({
      where: { id: env.conversationId },
      data: { current_step: next, context: ctx as object },
    });

    return { loop: 'continue', stepKey: next, ctx, inboundForWait };
  }

  /**
   * Pipeline WhatsApp: garantir conversa + agente padrão → resolver botões pendentes →
   * escolher fluxo ativo ou novo → executar passos até esperar utilizador ou esgotar passos.
   * Todas as respostas ao utilizador passam por `outbound` (texto ou botões); evitamos retorno vazio.
   */
  static async runInbound(params: { userId: string; phoneNumber: string; whatsappId: string; incomingText: string; webhookEvent?: string | null; }): Promise<FlowProcessResult> {
    const webhookEvent = this.normalizeEvent(params.webhookEvent ?? null);
    const outbound: OutboundMessage[] = [];
    let conversation = await this.reloadConversation(params.whatsappId);

    if (!conversation) {
      await prisma.conversation.create({ data: { phone_number: params.phoneNumber, whatsapp_id: params.whatsappId, messages: [] } });
      conversation = await this.reloadConversation(params.whatsappId);
    }

    if (!conversation) return { outbound: [] };

    if (!conversation.agent_id) {
      const defaultAgent = await prisma.agent.findFirst({
        where: { user_id: params.userId, is_active: true },
        include: { flows: { where: { is_active: true }, include: { steps: true } } },
      });

      if (defaultAgent) {
        await prisma.conversation.update({where: { id: conversation.id }, data: { agent_id: defaultAgent.id } });
        conversation = await this.reloadConversation(params.whatsappId);
      }
    }

    // Sem agente não há fluxo: não usar IA global aqui (evita erro sem OPENROUTER e mantém tudo orientado a fluxo/agente).
    if (!conversation?.agent) return { outbound: [] };

    const agent = conversation.agent;
    const flows = (agent.flows || []) as FlowRow[];

    let ctx: FlowCtx = ((conversation.context as FlowCtx) || {}) as FlowCtx;
    const interrupt = this.findInterruptingTriggerFlow(flows, params.incomingText, webhookEvent);
    
    if (interrupt && conversation.active_flow_id && interrupt.id !== conversation.active_flow_id) {
      ctx = this.stripRuntimeKeys(ctx);
      await prisma.conversation.update({ where: { id: conversation.id }, data: { active_flow_id: null, current_step: null, context: ctx as object } });
      conversation = await this.reloadConversation(params.whatsappId);
      if (!conversation?.agent) return { outbound: [] };
    }

    ctx = ((conversation!.context as FlowCtx) || {}) as FlowCtx;

    const resolveButtons = (): string | null => {
      const pending = ctx.awaiting_buttons as { routing?: Record<string, string> } | undefined;
      if (!pending?.routing) return null;
      
      const raw = params.incomingText.trim();
      const low = raw.toLowerCase();
      
      if (pending.routing[raw]) return pending.routing[raw];
      if (pending.routing[low]) return pending.routing[low];
      
      for (const [k, v] of Object.entries(pending.routing)) {
        if (k.toLowerCase() === low) return v;
      }

      return null;
    };

    if (ctx.awaiting_buttons) {
      const target = resolveButtons();
      if (target) {
        delete ctx.awaiting_buttons;
        await prisma.conversation.update({ where: { id: conversation!.id }, data: { context: ctx as object, current_step: target } });
        conversation = await this.reloadConversation(params.whatsappId);
        ctx = ((conversation!.context as FlowCtx) || {}) as FlowCtx;
      } else {
        const trigOnMismatch = this.findInterruptingTriggerFlow(flows, params.incomingText, webhookEvent);
        if (trigOnMismatch) {
          ctx = this.stripRuntimeKeys(ctx);
          await prisma.conversation.update({ where: { id: conversation!.id }, data: { active_flow_id: null, current_step: null, context: ctx as object } });
          conversation = await this.reloadConversation(params.whatsappId);
          if (!conversation?.agent) return { outbound: [] };
          ctx = ((conversation!.context as FlowCtx) || {}) as FlowCtx;
        } else {
          await prisma.conversation.update({ where: { id: conversation!.id }, data: { context: ctx as object } });
          return { outbound: [] };
        }
      }
    }

    let flowEntity: FlowRow | null = null;

    if (conversation!.active_flow_id) {
      flowEntity =
        (flows.find((f) => f.id === conversation!.active_flow_id) as FlowRow | undefined) ||
        (conversation!.active_flow as unknown as FlowRow | null);
    }

    if (!flowEntity || !flowEntity.steps?.length) {
      const picked = this.selectFlowToStart(flows, params.incomingText, webhookEvent);
      if (!picked || !picked.steps?.length) {
        const text = await this.conversationalFallback(agent, params.incomingText);
        return { outbound: text ? [{ kind: 'text', text, delayMs: 1200 }] : [] };
      }

      flowEntity = picked;
      ctx.__flow_skip_wait_once = true;

      await prisma.conversation.update({ where: { id: conversation!.id }, data: { active_flow_id: picked.id, current_step: null, context: ctx as object } });

      conversation = await this.reloadConversation(params.whatsappId);
      ctx = ((conversation!.context as FlowCtx) || {}) as FlowCtx;
    }

    const flow = flowEntity!;
    if (!flow.steps.length) {
      await prisma.conversation.update({
        where: { id: conversation!.id },
        data: { active_flow_id: null, current_step: null, context: this.stripRuntimeKeys(ctx) as object },
      });

      const text = await this.conversationalFallback(agent, params.incomingText);
      return { outbound: text ? [{ kind: 'text', text, delayMs: 1200 }] : [] };
    }

    const byKey = this.stepsByKey(flow.steps);
    let stepKey = conversation!.current_step || this.entryStepKey(flow);
    if (!stepKey || !byKey.has(stepKey)) {
      await prisma.conversation.update({
        where: { id: conversation!.id },
        data: { active_flow_id: null, current_step: null, context: this.stripRuntimeKeys(ctx) as object },
      });
      const text = await this.conversationalFallback(agent, params.incomingText);
      return { outbound: text ? [{ kind: 'text', text, delayMs: 1200 }] : [] };
    }

    const stepEnv: InboundStepEnv = { conversationId: conversation!.id, flow, agent, incomingText: params.incomingText, outbound };

    let iterations = 0;
    let inboundForWait = params.incomingText;

    while (iterations < this.MAX_STEPS) {
      iterations++;
      const step = byKey.get(stepKey!);
      if (!step) break;

      const meta = (step.metadata as FlowCtx) || {};
      const kind = this.stepTypeOf(step.type);

      let run: InboundStepRunResult;

      switch (kind) {
        case 'start':
          run = this.inboundStepStart(step, ctx, inboundForWait);
          break;
        case 'send_message':
          run = await this.inboundStepSendMessage(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'interactive_buttons':
          run = await this.inboundStepInteractiveButtons(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'set_state':
          run = await this.inboundStepSetState(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'goto':
          run = await this.inboundStepGoto(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'wait_reply':
          run = await this.inboundStepWaitReply(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'interpret':
          run = await this.inboundStepInterpret(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'condition':
          run = await this.inboundStepCondition(step, meta, stepEnv, ctx, inboundForWait);
          break;
        case 'handover':
          run = await this.inboundStepHandover(step, stepEnv, ctx, inboundForWait);
          break;
        default:
          run = await this.inboundStepUnknown(step, stepEnv, ctx, inboundForWait);
          break;
      }

      stepKey = run.stepKey;
      ctx = run.ctx;
      inboundForWait = run.inboundForWait;
      if (run.loop === 'break') break;
    }

    // Evita webhook sem resposta quando o fluxo avança só com passos “silenciosos” (goto/set_state/etc.).
    if (outbound.length === 0) {
      const text = await this.conversationalFallback(agent, params.incomingText);
      return this.textReply(text?.trim() ? text : 'Recebemos sua mensagem. Em instantes continuamos.');
    }

    return { outbound };
  }
}
