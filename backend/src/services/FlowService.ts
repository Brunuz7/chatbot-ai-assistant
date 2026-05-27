import type { Flow } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { inboundTrace } from '../lib/inboundTrace.js';
import { whereNotDeleted } from '../lib/softDelete.js';
import { OpenRouterService } from './OpenRouterService.js';
import { KnowledgeBaseService } from './KnowledgeBaseService.js';
import { UserSettingService } from './UserSettingService.js';
import type {
  FlowResolved,
  InboundFlowHandler,
  InboundFlowParams,
  InboundFlowRunResult,
} from '../types/flowEngineTypes.js';
import type { FlowCtx, FlowProcessResult, FlowWithRelations, OutboundMessage } from '../types/flowTypes.js';
import type { RequestCompletiontParams } from '../types/openrouterTypes.js';

const INTERPRET_HISTORY_MAX_MESSAGES = 20;
const INTERPRET_HISTORY_MAX_TOTAL_CHARS = 6000;
const INTERPRET_HISTORY_MAX_ENTRY_CHARS = 1200;
const MAX_CHAIN_ITERATIONS = 64;

export type FlowWriteData = {
  name?: string;
  agent_id?: string | null;
  is_active?: boolean;
  entry_mode?: string;
  entry_instruction?: string | null;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  type?: string;
  content?: string | null;
  next_flow_id?: string | null;
  metadata?: unknown;
};

function flowDataFromInput(data: FlowWriteData): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.agent_id !== undefined) patch.agent_id = data.agent_id;
  if (data.is_active !== undefined) patch.is_active = data.is_active;
  if (data.entry_mode !== undefined) patch.entry_mode = data.entry_mode;
  if (data.entry_instruction !== undefined) patch.entry_instruction = data.entry_instruction;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.trigger_keywords !== undefined) patch.trigger_keywords = data.trigger_keywords as object;
  if (data.trigger_intents !== undefined) patch.trigger_intents = data.trigger_intents as object;
  if (data.entry_events !== undefined) patch.entry_events = data.entry_events as object;
  if (data.type !== undefined) patch.type = data.type;
  if (data.content !== undefined) patch.content = data.content;
  if (data.next_flow_id !== undefined) patch.next_flow_id = data.next_flow_id;
  if (data.metadata !== undefined) patch.metadata = (data.metadata as object) ?? {};
  return patch;
}

/** Aceita payload legado com `steps[]` — usa só o primeiro passo. */
export function normalizeFlowPayload(body: Record<string, unknown>): FlowWriteData {
  const steps = body.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    const first = steps[0] as Record<string, unknown>;
    const meta = (first.metadata as Record<string, unknown>) || {};
    const nextStep = String(first.next_step ?? '').trim();
    const targetFlow =
      String(meta.target_flow_id ?? meta.target_step ?? '').trim() ||
      (nextStep && /^[0-9a-f-]{36}$/i.test(nextStep) ? nextStep : '');

    return {
      name: body.name as string | undefined,
      agent_id: body.agent_id as string | null | undefined,
      is_active: body.is_active as boolean | undefined,
      entry_mode: body.entry_mode as string | undefined,
      entry_instruction: body.entry_instruction as string | null | undefined,
      priority: body.priority as number | undefined,
      trigger_keywords: body.trigger_keywords,
      trigger_intents: body.trigger_intents,
      entry_events: body.entry_events,
      type: String(first.type ?? 'interpret'),
      content: (first.content as string | null) ?? null,
      next_flow_id: targetFlow || null,
      metadata: meta,
    };
  }

  return body as FlowWriteData;
}

async function resolveAgentIdForUser(
  userId: string,
  agentId: string | null | undefined,
): Promise<string | null> {
  if (!agentId?.trim()) return null;
  const agent = await prisma.agent.findFirst({
    where: { id: agentId.trim(), user_id: userId, ...whereNotDeleted },
    select: { id: true },
  });
  return agent?.id ?? null;
}

export class FlowService {
  static async list(agentId: string) {
    return prisma.flow.findMany({
      where: { agent_id: agentId, ...whereNotDeleted },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async listAll(userId: string) {
    return prisma.flow.findMany({
      where: { user_id: userId, ...whereNotDeleted },
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async create(userId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = normalizeFlowPayload(raw as Record<string, unknown>);
    const agentId = await resolveAgentIdForUser(userId, data.agent_id);
    const entryInstruction = String(data.entry_instruction ?? '').trim() || null;

    return prisma.flow.create({
      data: {
        name: data.name || 'Novo fluxo',
        user_id: userId,
        agent_id: agentId,
        is_active: data.is_active ?? true,
        entry_mode: 'instruction',
        entry_instruction: entryInstruction,
        priority: data.priority ?? 0,
        trigger_keywords: [],
        trigger_intents: [],
        entry_events: (data.entry_events as object) ?? [],
        type: data.type ?? 'interpret',
        content: data.content ?? null,
        next_flow_id: data.next_flow_id ?? null,
        metadata: (data.metadata as object) ?? {},
      },
    });
  }

  static async update(id: string, userId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = normalizeFlowPayload(raw as Record<string, unknown>);
    const patch = flowDataFromInput(data);

    if (data.agent_id !== undefined) {
      patch.agent_id = await resolveAgentIdForUser(userId, data.agent_id);
    }
    if (data.entry_instruction !== undefined) {
      const trimmed = String(data.entry_instruction ?? '').trim();
      patch.entry_instruction = trimmed || null;
      patch.entry_mode = 'instruction';
      patch.trigger_keywords = [];
      patch.trigger_intents = [];
    }

    if (Object.keys(patch).length === 0) {
      return prisma.flow.findUnique({ where: { id } });
    }
    return prisma.flow.update({
      where: { id },
      data: patch as Parameters<typeof prisma.flow.update>[0]['data'],
    });
  }

  static async delete(id: string) {
    return prisma.flow.delete({ where: { id } });
  }


  static async belongsToUser(flowId: string, userId: string) {
    return prisma.flow.findFirst({ where: { id: flowId, user_id: userId, ...whereNotDeleted }, select: { id: true } });
  }
}

export class FlowEngineService {
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

  private static parseFlowMetadata(flow: Flow): Record<string, unknown> {
    const m = flow.metadata;
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>;
    return {};
  }

  private static summarizeFlow(flow: FlowWithRelations): string {
    const instruction = String(flow.entry_instruction ?? '').trim();
    const lines = [`Prioridade: ${flow.priority ?? 0}`];
    if (instruction) {
      lines.push(`Quando iniciar: ${instruction}`);
    } else {
      lines.push('(Sem instrução de início — use o nome do fluxo.)');
    }
    return lines.join('\n');
  }

  private static clampInterpretText(raw: string): string {
    const t = String(raw ?? '').trim();
    if (t.length <= INTERPRET_HISTORY_MAX_ENTRY_CHARS) return t;
    return `${t.slice(0, INTERPRET_HISTORY_MAX_ENTRY_CHARS)}…`;
  }

  private static async buildInterpretHistoryRecentBlock(
    userId: string,
    whatsappId: string,
    incomingText: string,
  ): Promise<string> {
    const incoming = String(incomingText ?? '').trim();
    const row = await prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
      select: { messages: true },
    });

    const messagesJson = row?.messages;
    const list = Array.isArray(messagesJson) ? (messagesJson as unknown[]) : [];

    const entries: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const role = o.direction === 'in' ? 'user' : o.direction === 'out' ? 'assistant' : null;
      if (!role) continue;
      const textRaw = String(o.content ?? '').trim();
      if (!textRaw) continue;
      entries.push({ role, content: textRaw });
    }

    while (
      entries.length > 0 &&
      entries[entries.length - 1].role === 'user' &&
      entries[entries.length - 1].content === incoming
    ) {
      entries.pop();
    }

    type Hist = { role: 'user' | 'assistant'; content: string };
    const mapped: Hist[] = entries.map((e) => ({
      role: e.role,
      content: FlowEngineService.clampInterpretText(e.content),
    }));

    let slice = mapped.slice(-INTERPRET_HISTORY_MAX_MESSAGES);
    const totalChars = (arr: Hist[]) => arr.reduce((n, m) => n + m.content.length, 0);
    while (slice.length > 0 && totalChars(slice) > INTERPRET_HISTORY_MAX_TOTAL_CHARS) {
      slice = slice.slice(1);
    }

    if (slice.length === 0) {
      return '(Sem mensagens anteriores registradas nesta conversa.)';
    }

    return slice.map((m) => (m.role === 'user' ? `Cliente: ${m.content}` : `Assistente: ${m.content}`)).join('\n');
  }

  private static nextFlowIdFrom(flow: Flow): string | null {
    return flow.next_flow_id?.trim() || null;
  }

  private static async loadFlowForUser(userId: string, flowId: string): Promise<FlowWithRelations | null> {
    const row = await prisma.flow.findFirst({
      where: {
        id: flowId,
        user_id: userId,
        is_active: true,
        ...whereNotDeleted,
      },
      include: { agent: true },
    });
    return row as FlowWithRelations | null;
  }

  private static async inboundFlowStart(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const next = this.nextFlowIdFrom(params.flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: next, inboundForWait: '' };
  }

  private static async inboundFlowSendMessage(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow, outbound } = params;
    const ctx: FlowCtx = {};
    const meta = this.parseFlowMetadata(flow);
    const text = this.interpolate(flow.content, ctx);
    if (text) outbound.push({ kind: 'text', text, delayMs: (meta.delay as number) || 1200 });

    const next = this.nextFlowIdFrom(flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: next, inboundForWait: '' };
  }

  private static async inboundFlowSendVoice(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow, outbound } = params;
    const ctx: FlowCtx = {};
    const meta = this.parseFlowMetadata(flow);
    const text = this.interpolate(flow.content, ctx);
    if (text) {
      outbound.push({
        kind: 'text',
        text,
        delayMs: (meta.delay as number) || 1200,
        forceAudio: true,
      });
    }

    const next = this.nextFlowIdFrom(flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: next, inboundForWait: '' };
  }

  private static async inboundFlowInteractiveButtons(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    return this.inboundFlowSendMessage(params);
  }

  private static async inboundFlowMessage(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    return this.inboundFlowSendMessage(params);
  }

  private static async inboundFlowGoto(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow } = params;
    const meta = this.parseFlowMetadata(flow);
    const target =
      String(meta.target_flow_id ?? meta.target_flow ?? '').trim() || this.nextFlowIdFrom(flow);

    if (!target) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: target, inboundForWait: '' };
  }

  private static async inboundFlowWaitReply(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow, incomingText } = params;
    const nextInbound = String(incomingText ?? '').trim();
    const next = this.nextFlowIdFrom(flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: nextInbound };
    return { loop: 'continue', nextFlowId: next, inboundForWait: nextInbound };
  }

  private static async inboundFlowInterpret(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    return this.runInboundInterpret(params, false);
  }

  private static async inboundFlowInterpretVoice(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    return this.runInboundInterpret(params, true);
  }

  private static async runInboundInterpret(
    params: InboundFlowParams,
    forceAudio: boolean,
  ): Promise<InboundFlowRunResult> {
    const { flow, agent, userId, incomingText, outbound, whatsappId } = params;

    const metadata = this.parseFlowMetadata(flow);
    const instruction =
      (typeof metadata.prompt === 'string' && metadata.prompt.trim()) ||
      (typeof metadata.instruction === 'string' && metadata.instruction.trim()) ||
      (typeof metadata.extract_instruction === 'string' && metadata.extract_instruction.trim()) ||
      flow.content ||
      'Responda a mensagem do usuário de forma útil, objetiva e cordial.';

    const sistemaGlobalRows = await UserSettingService.listActiveInstructions(userId);
    const sistemaGlobal =
      sistemaGlobalRows.map((r) => r.content.trim()).filter(Boolean).join('\n\n') ||
      '(Nenhuma instrução global cadastrada para esta empresa.)';

    const queryHint = [
      String(incomingText ?? ''),
      agent?.role,
      agent?.objective,
      flow.name,
      this.summarizeFlow(flow),
      instruction,
    ]
      .filter(Boolean)
      .join('\n');

    const knowledgeBlock = await KnowledgeBaseService.getRelevantFormattedForPrompt(userId, queryHint);
    const historyBlock = await this.buildInterpretHistoryRecentBlock(
      userId,
      whatsappId,
      String(incomingText ?? ''),
    );

    const currentText =
      FlowEngineService.clampInterpretText(String(incomingText ?? '')).trim() || '(mensagem vazia)';

    const agentBlock = agent
      ? '[AGENTE (opcional)]\n' +
        agent.name.trim() +
        '\n' +
        `Papel (role): ${agent.role.trim()}\n` +
        `Objetivo: ${agent.objective.trim()}\n` +
        `${agent.instructions.trim()}\n\n`
      : '';

    const systemPrompt =
      'Comportamento: responda apenas com texto pronto para enviar ao cliente no WhatsApp, em português do Brasil. ' +
      'Se o facto pedido não aparecer na base de conhecimento, diga claramente que não há esse dado cadastrado — não invente.\n\n' +
      '[SISTEMA GLOBAL]\n' +
      sistemaGlobal +
      '\n\n' +
      agentBlock +
      '[FLUXO ATIVO]\n' +
      flow.name.trim() +
      '\n' +
      `${this.summarizeFlow(flow)}\n\n${instruction.trim()}` +
      '\n\n' +
      '[BASE DE CONHECIMENTO]\n' +
      knowledgeBlock.trim() +
      '\n\n' +
      '[HISTÓRICO RECENTE]\n' +
      historyBlock;

    const requestCompletiont: RequestCompletiontParams = {
      temperature: 0.1,
      maxTokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `[MENSAGEM ATUAL]\n${currentText}` },
      ],
    };

    try {
      const raw = await OpenRouterService.requestCompletion(requestCompletiont);
      const reply = raw ? raw.trim() : '';
      const outboundMsg = { kind: 'text' as const, delayMs: 1200, forceAudio };
      if (reply) {
        outbound.push({ ...outboundMsg, text: reply });
      } else {
        outbound.push({
          ...outboundMsg,
          text: 'Desculpe, não consegui gerar uma resposta agora. Pode repetir a sua mensagem?',
        });
      }
    } catch (err: unknown) {
      const message = (err as Error)?.message || String(err);
      const errText = message.includes('OPENROUTER_API_KEY')
        ? 'Erro de configuração: OPENROUTER_API_KEY ausente.'
        : 'Desculpe, ocorreu um erro ao gerar a resposta.';
      outbound.push({ kind: 'text', text: errText, delayMs: 1200, forceAudio });
      return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    }

    const next = this.nextFlowIdFrom(flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: next, inboundForWait: '' };
  }

  private static async inboundFlowCondition(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow, incomingText } = params;
    const meta = this.parseFlowMetadata(flow);
    const needle = String(meta.value ?? '').trim();
    const op = meta.operator === 'equals' ? 'equals' : 'contains';
    const hay = String(incomingText ?? '').trim();
    const h = hay.toLowerCase();
    const n = needle.toLowerCase();

    let match = false;
    if (needle) {
      match = op === 'equals' ? h === n : h.includes(n);
    }

    const trueFlow = String(meta.true_flow_id ?? meta.true_step ?? '').trim() || null;
    const falseFlow = String(meta.false_flow_id ?? meta.false_step ?? '').trim() || null;
    const fallback = this.nextFlowIdFrom(flow);

    const dest = match ? trueFlow || fallback : falseFlow || fallback;
    if (!dest) return { loop: 'break', nextFlowId: null, inboundForWait: '' };

    return { loop: 'continue', nextFlowId: dest, inboundForWait: '' };
  }

  private static async inboundFlowHandover(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const { flow, outbound } = params;
    const text = flow.content || 'Um atendente humano dará continuidade em instantes.';
    outbound.push({ kind: 'text', text, delayMs: 1200 });
    return { loop: 'break', nextFlowId: null, inboundForWait: '' };
  }

  private static async inboundFlowUnknown(params: InboundFlowParams): Promise<InboundFlowRunResult> {
    const next = this.nextFlowIdFrom(params.flow);
    if (!next) return { loop: 'break', nextFlowId: null, inboundForWait: '' };
    return { loop: 'continue', nextFlowId: next, inboundForWait: '' };
  }

  private static async resolveFlow(userId: string, incomingText: string): Promise<FlowResolved | null> {
    const input = incomingText.toLowerCase();

    const flows = await prisma.flow.findMany({
      where: {
        user_id: userId,
        is_active: true,
        ...whereNotDeleted,
      },
      include: { agent: true },
    });
    inboundTrace('flow.resolve.candidatos', {
      userId,
      count: flows.length,
      names: flows.map((f) => f.name).slice(0, 10),
    });
    if (flows.length === 0) return null;

    try {
      const selectedId = await OpenRouterService.resolveFlowWithAI({
        incomingText,
        flows: flows.map((f) => ({
          id: f.id,
          name: f.name,
          priority: f.priority || 0,
          entry_instruction: f.entry_instruction,
        })),
      });

      if (!selectedId) throw new Error('Fluxo não identificado pela IA');

      const selected = flows.find((f) => f.id === selectedId);
      if (selected) {
        inboundTrace('flow.resolve.ia', { flowId: selected.id, flowName: selected.name });
        return selected as FlowResolved;
      }

      throw new Error('Fluxo não encontrado');
    } catch {
      const matched = flows
        .filter((f) => {
          const intents = (f.trigger_intents as string[]) ?? [];
          const legacyKw = (f.trigger_keywords as string[]) ?? [];
          const needles = [...intents, ...legacyKw].map((k) => String(k).trim().toLowerCase()).filter(Boolean);
          return needles.some((k) => input.includes(k));
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

      if (matched) {
        inboundTrace('flow.resolve.keywords', { flowId: matched.id, flowName: matched.name });
        return matched as FlowResolved;
      }

      const fallback = flows
        .filter((f) => {
          const intents = ((f.trigger_intents as string[]) ?? []).length;
          const kw = ((f.trigger_keywords as string[]) ?? []).length;
          return intents === 0 && kw === 0;
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

      if (fallback) {
        inboundTrace('flow.resolve.fallback', { flowId: fallback.id, flowName: fallback.name });
      } else {
        inboundTrace('flow.resolve.nenhum', { userId, preview: input.slice(0, 60) });
      }
      return (fallback as FlowResolved) ?? null;
    }
  }

  static async executeInboundFlow(params: {
    userId: string;
    phoneNumber: string;
    whatsappId: string;
    incomingText: string;
    webhookEvent?: string | null;
  }): Promise<FlowProcessResult> {
    const outbound: OutboundMessage[] = [];
    let incomingText = params.incomingText;
    let flowResume: FlowProcessResult['flowResume'] = null;

    inboundTrace('flow.inicio', {
      userId: params.userId,
      whatsappId: params.whatsappId,
      preview: String(params.incomingText ?? '').slice(0, 80),
    });

    let currentFlow = await this.resolveFlow(params.userId, params.incomingText);

    if (!currentFlow) {
      inboundTrace('flow.sem_fluxo', { userId: params.userId });
      return { outbound, flowResume: null };
    }

    const ctor = this as typeof FlowEngineService;
    const visited = new Set<string>();
    let iterations = 0;

    const loadFlow = (flowId: string) => this.loadFlowForUser(params.userId, flowId);

    inboundTrace('flow.executando', {
      flowId: currentFlow.id,
      flowName: currentFlow.name,
      type: currentFlow.type,
    });

    while (currentFlow && iterations++ < MAX_CHAIN_ITERATIONS) {
      if (visited.has(currentFlow.id)) {
        inboundTrace('flow.ciclo', { flowId: currentFlow.id });
        break;
      }
      visited.add(currentFlow.id);

      const fnName =
        'inboundFlow' + currentFlow.type.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase());
      inboundTrace('flow.passo', { flowId: currentFlow.id, type: currentFlow.type, handler: fnName });

      const hub = ctor as unknown as Record<string, InboundFlowHandler | undefined>;
      const handler = hub[fnName]?.bind(ctor) || ctor.inboundFlowUnknown.bind(ctor);
      const result = await handler({
        flow: currentFlow,
        agent: currentFlow.agent,
        userId: params.userId,
        incomingText,
        whatsappId: params.whatsappId,
        outbound,
        loadFlow,
      });

      if (result.loop === 'break') {
        if (currentFlow.type === 'wait_reply' && !result.nextFlowId) {
          flowResume = { flowId: currentFlow.id };
        }
        inboundTrace('flow.passo.break', { flowId: currentFlow.id, outboundCount: outbound.length });
        break;
      }

      if (result.inboundForWait !== '') incomingText = result.inboundForWait;

      const nextId = result.nextFlowId;
      if (!nextId) break;

      const nextFlow = await loadFlow(nextId);
      if (!nextFlow) {
        inboundTrace('flow.proximo.ausente', { nextFlowId: nextId });
        break;
      }
      currentFlow = nextFlow;
    }

    inboundTrace('flow.fim', {
      outboundCount: outbound.length,
      lastPreview: outbound[outbound.length - 1]?.text?.slice(0, 80) ?? null,
      flowResume: flowResume?.flowId ?? null,
    });

    return { outbound, flowResume };
  }
}
