import type { FlowStep } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
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

  /** Monta roteamento e botões (até 3) a partir de metadata + next_step. */
  private static interactiveButtonsFromStep(step: FlowStep, meta: Record<string, unknown>): {
    routing: Record<string, string>;
    buttons: { id: string; type: 'reply'; displayText: string }[];
  } {
    const buttonsRaw = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
    const targets = (meta.button_targets as Record<string, string>) || {};
    const routing: Record<string, string> = {};

    const mapped = buttonsRaw.slice(0, 3).map((b) => {
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

    if (mapped.length > 0 && Object.keys(routing).length === 0 && step.next_step) {
      for (const b of mapped) {
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

    const buttons = mapped.filter((b) => (b.displayText || b.id).trim().length > 0);
    return { routing, buttons };
  }

  private static routeButtonDestination(step: FlowStep, incomingText: string): string | null {
    const meta = this.parseStepMetaData(step);
    const { routing } = this.interactiveButtonsFromStep(step, meta);
    const raw = String(incomingText ?? '').trim();
    if (!raw) return null;
    return routing[raw] || routing[raw.toLowerCase()] || null;
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

  private static async inboundStepInteractiveButtons(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step, outbound } = params;
    const ctx: FlowCtx = {};
    const meta = this.parseStepMetaData(step);
    const title = this.interpolate((meta.title as string) || step.content || 'Escolha uma opção', ctx);
    const description = meta.description ? this.interpolate(String(meta.description), ctx) : undefined;
    const footer = meta.footer ? this.interpolate(String(meta.footer), ctx) : undefined;
    const { routing, buttons: usableButtons } = this.interactiveButtonsFromStep(step, meta);

    if (usableButtons.length === 0) {
      outbound.push({ kind: 'text', text: title || 'Configure pelo menos um botão com texto.', delayMs: 1200 });
    } else if (Object.keys(routing).length === 0) {
      outbound.push({
        kind: 'text',
        text:
          `${title}\n\n` +
          'Defina em cada botão o campo "Ir para etapa" ou escolha "Próxima etapa" nesta etapa para enviar botões no WhatsApp.',
        delayMs: 1200,
      });
    } else {
      outbound.push({
        kind: 'buttons',
        title: title || 'Escolha uma opção',
        description,
        footer,
        buttons: usableButtons,
        delayMs: (meta.delay as number) || 1200,
      });
    }

    return { loop: 'break', stepKey: step.key, inboundForWait: '' };
  }

  private static async inboundStepSetState(params: InboundStepParams): Promise<InboundStepRunResult> {
    const { step } = params;
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

    const metadata = step.metadata && typeof step.metadata === 'object' && !Array.isArray(step.metadata)
      ? (step.metadata as Record<string, unknown>)
      : {};
        
    const instruction =
      (typeof metadata.prompt === 'string' && metadata.prompt.trim()) ||
      (typeof metadata.instruction === 'string' && metadata.instruction.trim()) ||
      step.content ||
      'Responda a mensagem do usuário de forma útil, objetiva e cordial.';

    const systemPrompt =
      'Você é um assistente virtual e deve responder SEMPRE em português do Brasil.\n' +
      `Contexto do agente: role=${agent.role}, objective=${agent.objective}.\n` +
      `Diretriz: ${instruction}`;

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
    const { step } = params;
    const branchKey = step.next_step ?? null;
    if (!branchKey) return { loop: 'break', stepKey: null, inboundForWait: '' };
    return { loop: 'continue', stepKey: branchKey, inboundForWait: '' };
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
          id: f.id, name: f.name,
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
      // Procura fluxos que possuem palavra-chave compatível
      const matched = flows
        .filter((f) => {
          const keywords = (f.trigger_keywords as string[]) ?? [];
          return keywords.some((k) => input.includes(k.toLowerCase()));
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

      if (matched) return matched as FlowResolved;

      // Se nenhum fluxo bater por palavra-chave, pega o fluxo sem palavra-chave de maior prioridade
      const fallback = flows
        .filter((f) => ((f.trigger_keywords as string[]) ?? []).length === 0)
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
    resume?: { flowId: string; stepKey: string };
  }): Promise<FlowProcessResult> {
    const outbound: OutboundMessage[] = [];
    let incomingText = params.incomingText;

    let flow: FlowResolved | null = null;
    let currentKey: string | null = null;

    const r = params.resume;
    if (r?.flowId && r.stepKey) {
      const rf = await prisma.flow.findFirst({
        where: { id: r.flowId, is_active: true, agent: { user_id: params.userId } },
        include: { agent: true, steps: true },
      });
      if (rf?.steps?.length) {
        const pauseStep = rf.steps.find((s) => s.key === r.stepKey);
        if (pauseStep?.type === 'interactive_buttons') {
          const dest = this.routeButtonDestination(pauseStep, incomingText);
          if (dest && rf.steps.some((s) => s.key === dest)) {
            flow = rf as FlowResolved;
            currentKey = dest;
          }
        }
      }
    }

    if (!flow) {
      flow = await this.resolveFlow(params.userId, params.incomingText);
    }

    if (!flow || !flow.steps?.length) {
      return { outbound, flowResume: null };
    }

    const steps = [...flow.steps];
    const agent = flow.agent;
    delete flow.steps;

    const byKey = new Map(steps.map((s) => [s.key, s]));
    if (!currentKey) {
      currentKey =
        flow.entry_step_key && byKey.has(flow.entry_step_key)
          ? flow.entry_step_key
          : steps[0]?.key ?? null;
    }

    const ctor = this as typeof FlowEngineService;
    const maxIterations = Math.max(steps.length * 25, 64);
    let iterations = 0;
    let flowResume: { flowId: string; stepKey: string } | null = null;

    while (currentKey && iterations++ < maxIterations) {
      const step = byKey.get(currentKey);
      if (!step) break;

      const fnName = 'inboundStep' + step.type.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase());
      const hub = ctor as unknown as Record<string, InboundStepHandler | undefined>;
      const handler = hub[fnName]?.bind(ctor) || ctor.inboundStepUnknown.bind(ctor);
      const result = await handler({ step, flow, agent, incomingText, outbound });

      if (result.loop === 'break') {
        const last = outbound[outbound.length - 1];
        if (step.type === 'interactive_buttons' && last?.kind === 'buttons') {
          flowResume = { flowId: flow.id, stepKey: step.key };
        }
        break;
      }

      const next = result.stepKey;
      if (!next || !byKey.has(next)) break;
      if (result.inboundForWait !== '') incomingText = result.inboundForWait;

      currentKey = next;
    }

    return { outbound, flowResume };
  }
}
