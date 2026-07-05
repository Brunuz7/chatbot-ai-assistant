import type { Flow } from '@prisma/client';
import { prisma, whereNotDeleted } from '../prisma.js';
import { inboundTrace } from '../utils/inboundTrace.js';
import { OpenRouterService } from './OpenRouterService.js';
import { KnowledgeBaseService } from './KnowledgeBaseService.js';
import { UserSettingService } from './UserSettingService.js';
import {
  buildInterpretSystemPrompt,
  buildInterpretUserMessage,
  emptyCurrentMessage,
  emptyGlobalInstructions,
  emptyHistory,
  flowNoEntryInstruction,
  formatHistoryBlock,
  handoverDefault,
  interpretDefaultInstruction,
  interpretEmptyReply,
  interpretErrorReply,
  interpretOpenRouterKeyMissing,
} from '../constants/prompts.js';
import type {
  FlowCtx,
  FlowProcessResult,
  FlowResolved,
  FlowWithRelations,
  InboundFlowHandler,
  InboundFlowParams,
  InboundFlowRunResult,
  OutboundMessage,
  RequestCompletiontParams,
} from '../types/index.js';

export class FlowEngineService {
  private static readonly interpretHistoryMaxMessages = 20;
  private static readonly interpretHistoryMaxTotalChars = 6000;
  private static readonly interpretHistoryMaxEntryChars = 1200;
  private static readonly maxChainIterations = 64;

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
      lines.push(flowNoEntryInstruction);
    }
    return lines.join('\n');
  }

  private static clampInterpretText(raw: string): string {
    const t = String(raw ?? '').trim();
    if (t.length <= FlowEngineService.interpretHistoryMaxEntryChars) return t;
    return `${t.slice(0, FlowEngineService.interpretHistoryMaxEntryChars)}…`;
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

    let slice = mapped.slice(-FlowEngineService.interpretHistoryMaxMessages);
    const totalChars = (arr: Hist[]) => arr.reduce((n, m) => n + m.content.length, 0);
    while (slice.length > 0 && totalChars(slice) > FlowEngineService.interpretHistoryMaxTotalChars) {
      slice = slice.slice(1);
    }

    if (slice.length === 0) return emptyHistory;

    return formatHistoryBlock(slice);
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
      interpretDefaultInstruction;

    const sistemaGlobalRows = await UserSettingService.listActiveInstructions(userId);
    const sistemaGlobal =
      sistemaGlobalRows.map((r) => r.content.trim()).filter(Boolean).join('\n\n') ||
      emptyGlobalInstructions;

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
      FlowEngineService.clampInterpretText(String(incomingText ?? '')).trim() || emptyCurrentMessage;

    const systemPrompt = buildInterpretSystemPrompt({
      sistemaGlobal,
      agent,
      flowName: flow.name,
      flowSummary: this.summarizeFlow(flow),
      instruction,
      knowledgeBlock,
      historyBlock,
    });

    const requestCompletiont: RequestCompletiontParams = {
      temperature: 0.1,
      maxTokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildInterpretUserMessage(currentText) },
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
          text: interpretEmptyReply,
        });
      }
    } catch (err: unknown) {
      const message = (err as Error)?.message || String(err);
      const errText = message.includes('OPENROUTER_API_KEY')
        ? interpretOpenRouterKeyMissing
        : interpretErrorReply;
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
    const text = flow.content || handoverDefault;
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
      if (selected) return selected as FlowResolved;

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

      if (matched) return matched as FlowResolved;

      const fallback = flows
        .filter((f) => {
          const intents = ((f.trigger_intents as string[]) ?? []).length;
          const kw = ((f.trigger_keywords as string[]) ?? []).length;
          return intents === 0 && kw === 0;
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

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
    let currentFlow = await this.resolveFlow(params.userId, params.incomingText);

    if (!currentFlow) return { outbound, flowResume: null };

    const ctor = this as typeof FlowEngineService;
    const visited = new Set<string>();
    let iterations = 0;

    const loadFlow = (flowId: string) => this.loadFlowForUser(params.userId, flowId);

    while (currentFlow && iterations++ < FlowEngineService.maxChainIterations) {
      if (visited.has(currentFlow.id)) break;
      visited.add(currentFlow.id);

      const fnName = 'inboundFlow' + currentFlow.type.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase());

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

        break;
      }

      if (result.inboundForWait !== '') incomingText = result.inboundForWait;

      const nextId = result.nextFlowId;
      if (!nextId) break;

      const nextFlow = await loadFlow(nextId);
      if (!nextFlow) break;
  
      currentFlow = nextFlow;
    }

    return { outbound, flowResume };
  }
}