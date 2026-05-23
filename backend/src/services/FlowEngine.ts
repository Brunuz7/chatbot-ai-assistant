import type { Flow } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { whereNotDeleted } from '../lib/softDelete.js';
import { InstructionService } from './InstructionService.js';
import { KnowledgeBaseService } from './KnowledgeBaseService.js';
import { OpenRouterService } from './OpenRouterService.js';
import type {
  FlowResolved,
  InboundFlowHandler,
  InboundFlowParams,
  InboundFlowRunResult,
} from '../types/flowEngineTypes.js';
import { inboundTrace } from '../lib/inboundTrace.js';
import type { FlowCtx, FlowProcessResult, FlowWithRelations, OutboundMessage } from '../types/flowTypes.js';
import type { RequestCompletiontParams } from '../types/openrouterTypes.js';

const INTERPRET_HISTORY_MAX_MESSAGES = 20;
const INTERPRET_HISTORY_MAX_TOTAL_CHARS = 6000;
const INTERPRET_HISTORY_MAX_ENTRY_CHARS = 1200;
const MAX_CHAIN_ITERATIONS = 64;

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
    const lines = [`Modo de entrada: ${flow.entry_mode}`, `Prioridade: ${flow.priority ?? 0}`];
    const intents = flow.trigger_intents;
    const kw = flow.trigger_keywords;
    if (Array.isArray(intents) && intents.length) {
      lines.push(`Intenções / disparadores: ${intents.slice(0, 20).map(String).join(', ')}`);
    } else if (Array.isArray(kw) && kw.length) {
      lines.push(`Palavras-chave (legado): ${kw.slice(0, 20).map(String).join(', ')}`);
    } else {
      lines.push('(Use o nome do fluxo e o conteúdo da ação para orientar a IA.)');
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
        is_active: true,
        ...whereNotDeleted,
        agent: { user_id: userId, ...whereNotDeleted },
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
    const { flow, agent, incomingText, outbound, whatsappId } = params;

    const metadata = this.parseFlowMetadata(flow);
    const instruction =
      (typeof metadata.prompt === 'string' && metadata.prompt.trim()) ||
      (typeof metadata.instruction === 'string' && metadata.instruction.trim()) ||
      (typeof metadata.extract_instruction === 'string' && metadata.extract_instruction.trim()) ||
      flow.content ||
      'Responda a mensagem do usuário de forma útil, objetiva e cordial.';

    const sistemaGlobalRows = await InstructionService.listActiveByUser(agent.user_id);
    const sistemaGlobal =
      sistemaGlobalRows.map((r) => r.content.trim()).filter(Boolean).join('\n\n') ||
      '(Nenhuma instrução global cadastrada para esta empresa.)';

    const queryHint =
      [
        String(incomingText ?? ''),
        agent.role,
        agent.objective,
        flow.name,
        this.summarizeFlow(flow),
        instruction,
      ].join('\n') + '\n';

    const knowledgeBlock = await KnowledgeBaseService.getRelevantFormattedForPrompt(agent.user_id, queryHint);
    const historyBlock = await this.buildInterpretHistoryRecentBlock(
      agent.user_id,
      whatsappId,
      String(incomingText ?? ''),
    );

    const currentText =
      FlowEngineService.clampInterpretText(String(incomingText ?? '')).trim() || '(mensagem vazia)';

    const systemPrompt =
      'Comportamento: responda apenas com texto pronto para enviar ao cliente no WhatsApp, em português do Brasil. ' +
      'Se o facto pedido não aparecer na base de conhecimento, diga claramente que não há esse dado cadastrado — não invente.\n\n' +
      '[SISTEMA GLOBAL]\n' +
      sistemaGlobal +
      '\n\n' +
      '[AGENTE ATIVO]\n' +
      agent.name.trim() +
      '\n' +
      `Papel (role): ${agent.role.trim()}\n` +
      `Objetivo: ${agent.objective.trim()}\n` +
      `${agent.instructions.trim()}` +
      '\n\n' +
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
        is_active: true,
        ...whereNotDeleted,
        agent: { user_id: userId, ...whereNotDeleted },
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
          entry_mode: f.entry_mode,
          trigger_keywords: f.trigger_keywords,
          trigger_intents: f.trigger_intents,
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

      const agent = currentFlow.agent;
      const fnName =
        'inboundFlow' + currentFlow.type.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase());
      inboundTrace('flow.passo', { flowId: currentFlow.id, type: currentFlow.type, handler: fnName });

      const hub = ctor as unknown as Record<string, InboundFlowHandler | undefined>;
      const handler = hub[fnName]?.bind(ctor) || ctor.inboundFlowUnknown.bind(ctor);
      const result = await handler({
        flow: currentFlow,
        agent,
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
