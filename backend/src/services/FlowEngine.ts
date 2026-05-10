import type { FlowStep } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { KnowledgeBaseService } from './KnowledgeBaseService.js';
import { OpenRouterService } from './OpenRouterService.js';
import type { FlowResolved, InboundStepHandler, InboundStepParams, InboundStepRunResult } from '../types/flowEngineTypes.js';
import type { FlowCtx, FlowProcessResult, OutboundMessage } from '../types/flowTypes.js';
import { RequestCompletiontParams } from '../types/openrouterTypes.js';

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

  private static parseStepMetaData(step: FlowStep): Record<string, unknown> {
    const m = step.metadata;
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>;
    return {};
  }

  private static async inboundStepStart(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step } = params;
    const next = step.next_step || null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: '' };
    return { loop: 'continue', stepKey: next, inboundForWait: '' };
  }

  private static async inboundStepSendMessage(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, outbound } = params;
    const ctx: FlowCtx = {};
    const meta = this.parseStepMetaData(step);
    const text = this.interpolate(step.content, ctx);
    if (text) outbound.push({ kind: 'text', text, delayMs: (meta.delay as number) || 1200 });

    const next = step.next_step ?? null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: '' };

    return { loop: 'continue', stepKey: next, inboundForWait: '' };
  }

  /**
   * Etapa legada `interactive_buttons`: envia só texto (lista de opções), sem pausar o fluxo.
   */
  private static async inboundStepInteractiveButtons(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, outbound } = params;
    const ctx: FlowCtx = {};
    const meta = this.parseStepMetaData(step);
    const title = this.interpolate((meta.title as string) || step.content || 'Escolha uma opção', ctx);
    const buttonsRaw = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
    const lines = buttonsRaw
      .slice(0, 10)
      .map((b) => `• ${String(b.displayText || b.id || '').trim()}`)
      .filter((l) => l.length > 2);
    const body =
      lines.length > 0
        ? `${title}\n\n${lines.join('\n')}\n\nResponda com o texto da opção ou envie outra mensagem.`
        : title;
    const delay = (meta.delay as number) || 1200;
    if (body.trim()) outbound.push({ kind: 'text', text: body.trim().slice(0, 4096), delayMs: delay });

    const next = step.next_step ?? null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: '' };
    return { loop: 'continue', stepKey: next, inboundForWait: '' };
  }

  private static async inboundStepGoto(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step } = params;
    const meta = this.parseStepMetaData(step);
    const target = ((meta.target_step as string) || (meta.target as string) || step.next_step) ?? null;

    if (!target) return { loop: 'break', stepKey: null, inboundForWait: '' };

    return { loop: 'continue', stepKey: target, inboundForWait: '' };
  }

  private static async inboundStepWaitReply(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, incomingText } = params;
    const nextInbound = String(incomingText ?? '').trim();
    const next = step.next_step ?? null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: nextInbound };
    return { loop: 'continue', stepKey: next, inboundForWait: nextInbound };
  }

  private static async inboundStepInterpret(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, agent, incomingText, outbound } = params;
    let inboundForWait = '';

    const metadata =
      step.metadata && typeof step.metadata === 'object' && !Array.isArray(step.metadata)
        ? (step.metadata as Record<string, unknown>)
        : {};

    const instruction =
      (typeof metadata.prompt === 'string' && metadata.prompt.trim()) ||
      (typeof metadata.instruction === 'string' && metadata.instruction.trim()) ||
      (typeof metadata.extract_instruction === 'string' && metadata.extract_instruction.trim()) ||
      step.content ||
      'Responda a mensagem do usuário de forma útil, objetiva e cordial.';

    const knowledgeBlock = await KnowledgeBaseService.getFormattedContextForPrompt();

    const systemPrompt =
      'Você é um assistente virtual e deve responder SEMPRE em português do Brasil.\n' +
      `Contexto do agente: role=${agent.role}, objective=${agent.objective}.\n` +
      `Diretriz: ${instruction}\n\n` +
      'Base de conhecimento (obrigatório: alinhe as respostas a estes conteúdos quando forem relevantes. ' +
      'Se a pergunta for sobre um tema coberto aqui, use as informações abaixo; não contradiga sem motivo explícito. ' +
      'Se a informação necessária não constar na base, diga claramente que não tem esse dado cadastrado — não invente factos.):\n\n' +
      knowledgeBlock;

    const requestCompletiont: RequestCompletiontParams = {
      temperature: 0.1,
      maxTokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: String(incomingText ?? '') },
      ],
    };

    try {
      const raw = await OpenRouterService.requestCompletion(requestCompletiont);
      inboundForWait = raw ? raw.trim() : '';
    } catch (err: unknown) {
      const message = (err as Error)?.message || String(err);
      const errText = message.includes('OPENROUTER_API_KEY')
        ? 'Erro de configuração: OPENROUTER_API_KEY ausente.'
        : 'Desculpe, ocorreu um erro ao gerar a resposta.';
      outbound.push({ kind: 'text', text: errText, delayMs: 1200 });
      return { loop: 'break', stepKey: null, inboundForWait: '' };
    }

    if (inboundForWait) outbound.push({ kind: 'text', text: inboundForWait, delayMs: 1200 });

    const next = step.next_step ?? null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: '' };

    return { loop: 'continue', stepKey: next, inboundForWait: '' };
  }

  private static async inboundStepCondition(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, incomingText } = params;
    const meta = this.parseStepMetaData(step);
    const needle = String(meta.value ?? '').trim();
    const op = meta.operator === 'equals' ? 'equals' : 'contains';
    const hay = String(incomingText ?? '').trim();
    const h = hay.toLowerCase();
    const n = needle.toLowerCase();

    let match = false;
    if (needle) {
      match = op === 'equals' ? h === n : h.includes(n);
    }

    const trueStep = String(meta.true_step ?? '').trim() || null;
    const falseStep = String(meta.false_step ?? '').trim() || null;
    const fallback = step.next_step?.trim() || null;

    const dest = match ? trueStep || fallback : falseStep || fallback;
    if (!dest) return { loop: 'break', stepKey: null, inboundForWait: '' };

    return { loop: 'continue', stepKey: dest, inboundForWait: '' };
  }

  private static async inboundStepHandover(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, outbound } = params;
    const text = step.content || 'Um atendente humano dará continuidade em instantes.';
    outbound.push({ kind: 'text', text, delayMs: 1200 });
    return { loop: 'break', stepKey: null, inboundForWait: '' };
  }

  private static async inboundStepUnknown(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step } = params;
    const next = step.next_step ?? null;
    if (!next) return { loop: 'break', stepKey: null, inboundForWait: '' };
    return { loop: 'continue', stepKey: next, inboundForWait: '' };
  }

  private static async resolveFlow(userId: string, incomingText: string): Promise<FlowResolved | null> {
    const input = incomingText.toLowerCase();

    const flows = await prisma.flow.findMany({
      where: { is_active: true, agent: { user_id: userId } },
      include: { agent: true, steps: true },
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

    const flow = await this.resolveFlow(params.userId, params.incomingText);

    if (!flow || !flow.steps?.length) {
      return { outbound, flowResume: null };
    }

    const steps = [...flow.steps];
    const agent = flow.agent;
    delete flow.steps;

    let currentKey =
      flow.entry_step_key && steps.some((s) => s.key === flow.entry_step_key)
        ? flow.entry_step_key
        : steps[0]?.key ?? null;

    const ctor = this as typeof FlowEngineService;
    const maxIterations = Math.max(steps.length * 25, 64);
    let iterations = 0;

    const byKey = new Map(steps.map((s) => [s.key, s]));

    while (currentKey && iterations++ < maxIterations) {
      const step = byKey.get(currentKey);
      if (!step) break;

      const fnName = 'inboundStep' + step.type.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase());
      const hub = ctor as unknown as Record<string, InboundStepHandler | undefined>;
      const handler = hub[fnName]?.bind(ctor) || ctor.inboundStepUnknown.bind(ctor);
      const result = await handler({ step, flow, agent, incomingText, outbound });

      if (result.loop === 'break') {
        break;
      }

      const next = result.stepKey;
      if (!next || !byKey.has(next)) break;
      if (result.inboundForWait !== '') incomingText = result.inboundForWait;

      currentKey = next;
    }

    return { outbound, flowResume: null };
  }
}
