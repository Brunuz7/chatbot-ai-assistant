import axios from 'axios';

// Serviço responsável por processar mensagens usando a API da OpenRouter.
// Configuração via variáveis de ambiente:
// - OPENROUTER_API_KEY (obrigatório)
// - OPENROUTER_MODEL (opcional, padrão: gpt-4o-mini)
// - OPENROUTER_URL (opcional, padrão: https://api.openrouter.ai/v1/chat/completions)

const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://api.openrouter.ai/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';

export class MessageProcessor {
  /**
   * Processa a mensagem recebida e retorna a resposta gerada pela OpenRouter.
   * @param userId - id do usuário (para auditoria / logs, atualmente não usado pela API)
   * @param text - texto da mensagem do usuário
   * @returns resposta gerada pelo modelo (string)
   */
  static async processIncomingMessage(userId: string, text: string): Promise<string> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY não configurada. Defina OPENROUTER_API_KEY no ambiente.');
    }

    try {
      const payload = {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: text }],
        temperature: 0.2,
        max_tokens: 512
      } as any;

      const resp = await axios.post(OPENROUTER_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        timeout: 20000
      });

      const data = resp.data;

      // Tentar extrair a resposta em formatos comuns retornados por OpenRouter / compatível com OpenAI
      let reply: string | null = null;

      if (data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        const choice = data.choices[0];
        reply = choice?.message?.content ?? choice?.text ?? null;
      }

      // fallback para formato alternativo
      if (!reply && Array.isArray(data?.output) && data.output.length > 0) {
        const out = data.output[0];
        // estrutura possível: output[0].content[0].text
        reply = out?.content?.[0]?.text ?? out?.content?.[0]?.payload?.text ?? null;
      }

      if (!reply && typeof data?.result === 'string') reply = data.result;

      // último recurso: devolver JSON truncado
      if (!reply) reply = JSON.stringify(data);

      // sanitizar e truncar a resposta para evitar caracteres inválidos que podem quebrar o envio
      let sanitized = String(reply).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim();
      const MAX_LEN = 1000;
      if (sanitized.length > MAX_LEN) sanitized = sanitized.slice(0, MAX_LEN) + '...';

      return sanitized;
    } catch (err: any) {
      const remote = err?.response?.data ?? err?.message ?? String(err);
      throw new Error(`Erro ao chamar OpenRouter: ${typeof remote === 'string' ? remote : JSON.stringify(remote)}`);
    }
  }
}

export default MessageProcessor;
