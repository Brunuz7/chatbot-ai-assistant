import * as OpenRouterModule from '@openrouter/sdk';
import type { RequestCompletiontParams, ResolveFlowParams } from '../types/openrouterTypes.js';

const _openRouterAny = OpenRouterModule as any;
const OpenRouter: any = _openRouterAny.OpenRouter ?? _openRouterAny.default ?? _openRouterAny;
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';

export class OpenRouterService {
  private static getApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OPENROUTER_API_KEY não configurada. Defina OPENROUTER_API_KEY no ambiente.');
    }
    return key;
  }

  private static getClient(): any {
    return new OpenRouter({ apiKey: this.getApiKey() });
  }

  private static normalizeError(err: unknown): string {
    const anyErr = err as any;
    const remote = anyErr?.response?.data ?? anyErr?.message ?? String(anyErr);
    return typeof remote === 'string' ? remote : JSON.stringify(remote);
  }

  static async requestCompletion(params: RequestCompletiontParams): Promise<string | null> {
    try {
      const client = this.getClient();
      const resp = await client.chat.send({
        model: params.model || process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 512,
      } as any);

      const data = resp as any;
      if (!data || !Array.isArray(data.choices)) return null;

      const content = data.choices[0]?.message?.content;
      return typeof content === 'string' && content.trim() ? content : null;
    } catch (err) {
      const message = this.normalizeError(err);
      console.error(`Erro ao chamar OpenRouter: ${message}`);
      throw new Error(`Erro ao chamar OpenRouter: ${message}`);
    }
  }

  static extractJson(raw: string | null | undefined): Record<string, unknown> {
    if (!raw) return {};

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as unknown;
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return { _interpret_error: 'parse_failed' };
    }
  }

  static async resolveFlowWithAI(params: ResolveFlowParams): Promise<string | null> {
    if (!params.flows.length) return null;

    const systemPrompt =
      'Você é um roteador de fluxos de atendimento.\n' +
      'Sua tarefa é escolher APENAS um fluxo da lista com base na mensagem do usuário.\n' +
      'Considere principalmente `trigger_intents` (trechos esperados na mensagem); `trigger_keywords` é legado. Use `priority` como desempate.\n' +
      'Responda SOMENTE JSON válido no formato: {"selected_flow_id":"<id>"}.\n' +
      'Se nenhum fluxo for adequado, responda: {"selected_flow_id":null}.';

    const userText =
      `Mensagem do usuário:\n${params.incomingText}\n\n` +
      `Fluxos disponíveis (JSON):\n${JSON.stringify(params.flows)}`;

    const raw = await this.requestCompletion({
      model: params.model,
      temperature: 0,
      maxTokens: 250,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }],
    });
    const parsed = this.extractJson(raw);
    
    const selected = parsed.selected_flow_id;
    return typeof selected === 'string' && selected.trim() ? selected : null;
  }
}
