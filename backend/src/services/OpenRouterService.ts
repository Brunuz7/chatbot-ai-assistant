import axios from 'axios';
import * as OpenRouterModule from '@openrouter/sdk';
import type {
  RequestCompletiontParams,
  ResolveFlowParams,
  SynthesizeSpeechParams,
  TranscribeAudioParams,
} from '../types/openrouterTypes.js';

const _openRouterAny = OpenRouterModule as any;
const OpenRouter: any = _openRouterAny.OpenRouter ?? _openRouterAny.default ?? _openRouterAny;
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
const DEFAULT_OPENROUTER_STT_MODEL =
  process.env.OPENROUTER_STT_MODEL || 'mistralai/voxtral-mini-transcribe';
const DEFAULT_OPENROUTER_TTS_MODEL =
  process.env.OPENROUTER_TTS_MODEL || 'openai/gpt-4o-mini-tts-2025-12-15';
const DEFAULT_OPENROUTER_TTS_VOICE = process.env.OPENROUTER_TTS_VOICE || 'nova';
const OPENROUTER_API_BASE = (process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1').replace(
  /\/$/,
  '',
);

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

  /**
   * Transcreve áudio (base64) via OpenRouter STT (`/audio/transcriptions`).
   */
  static async transcribeAudio(params: TranscribeAudioParams): Promise<string | null> {
    const apiKey = this.getApiKey();
    const model = params.model || DEFAULT_OPENROUTER_STT_MODEL;

    try {
      const resp = await axios.post(
        `${OPENROUTER_API_BASE}/audio/transcriptions`,
        {
          model,
          input_audio: {
            data: params.base64,
            format: params.format,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120_000,
        },
      );

      const text = resp.data?.text;
      return typeof text === 'string' && text.trim() ? text.trim() : null;
    } catch (err) {
      const message = this.normalizeError(err);
      console.error(`Erro ao transcrever áudio (OpenRouter STT): ${message}`);
      throw new Error(`Erro ao transcrever áudio: ${message}`);
    }
  }

  /**
   * Sintetiza fala a partir de texto (`/audio/speech`).
   */
  static async synthesizeSpeech(params: SynthesizeSpeechParams): Promise<Buffer> {
    const apiKey = this.getApiKey();
    const model = params.model || DEFAULT_OPENROUTER_TTS_MODEL;
    const voice = params.voice?.trim() || DEFAULT_OPENROUTER_TTS_VOICE;
    const input = params.text.trim();
    if (!input) throw new Error('Texto vazio para síntese de voz');

    try {
      const resp = await axios.post(
        `${OPENROUTER_API_BASE}/audio/speech`,
        {
          model,
          input,
          voice,
          response_format: 'mp3',
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 120_000,
        },
      );

      const buf = Buffer.from(resp.data);
      if (!buf.length) throw new Error('Resposta TTS vazia');
      return buf;
    } catch (err) {
      const message = this.normalizeError(err);
      console.error(`Erro ao sintetizar áudio (OpenRouter TTS): ${message}`);
      throw new Error(`Erro ao sintetizar áudio: ${message}`);
    }
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

  static async classifyLeadTagWithAI(params: {
    tags: { id: string; name: string; description: string | null }[];
    historyBlock: string;
    currentMessage: string;
    model?: string;
  }): Promise<string | null> {
    if (!params.tags.length) return null;

    const systemPrompt =
      'Você é um assistente de qualificação de leads em atendimento por WhatsApp.\n' +
      'Com base no histórico recente e na mensagem actual do cliente, escolha UMA tag que melhor descreve a intenção e estágio do contacto neste momento.\n' +
      'Considere todo o contexto da conversa, não apenas a última frase isolada.\n' +
      'Responda SOMENTE JSON válido: {"selected_tag_id":"<id>"}.\n' +
      'Se nenhuma tag for adequada, responda: {"selected_tag_id":null}.';

    const tagsForPrompt = params.tags.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description?.trim() || null,
    }));

    const userText =
      `[TAGS DISPONÍVEIS]\n${JSON.stringify(tagsForPrompt, null, 2)}\n\n` +
      `[HISTÓRICO RECENTE]\n${params.historyBlock}\n\n` +
      `[MENSAGEM ACTUAL DO CLIENTE]\n${params.currentMessage}`;

    const raw = await this.requestCompletion({
      model: params.model,
      temperature: 0,
      maxTokens: 120,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
    });

    const parsed = this.extractJson(raw);
    const selected = parsed.selected_tag_id;
    return typeof selected === 'string' && selected.trim() ? selected.trim() : null;
  }
}
