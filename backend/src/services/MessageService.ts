import * as OpenRouterModule from '@openrouter/sdk';
import { InstructionService } from './InstructionService.js';

const _openRouterAny = OpenRouterModule as any;
const OpenRouter: any = _openRouterAny.OpenRouter ?? _openRouterAny.default ?? _openRouterAny;
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';

export class MessageService {
  static async processIncomingMessage(userId: string, text: string): Promise<string | null> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY não configurada. Defina OPENROUTER_API_KEY no ambiente.');
    }

    try {
      const client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
      const instruction = userId ? await InstructionService.getByUser(userId) : null;
      const behavior = 'Professional and helpful assistant.';
      const responseRules = 'Always be polite. Answer in the same language as the user.';
      const systemPrompt = [
        behavior,
        responseRules,
        instruction?.is_active ? `Instrucao global do usuario:\n${instruction.content}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const resp = await client.chat.send({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: 512,
      } as any);

      const data = resp as any;
      if (!data || Array.isArray(data.choices) === false) return null;

      const choice = data.choices[0];
      const mesage = choice?.message?.content || null;
      if (!mesage) return null;

      return mesage;
    } catch (err: any) {
      const remote = err?.response?.data ?? err?.message ?? String(err);
      console.error(`Erro ao chamar OpenRouter: ${remote}`);
      throw new Error(`Erro ao chamar OpenRouter: ${typeof remote === 'string' ? remote : JSON.stringify(remote)}`);
    }
  }
}
