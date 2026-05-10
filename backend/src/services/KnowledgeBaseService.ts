import { prisma } from '../lib/prisma.js';

/** Limite aproximado para caber no contexto com o resto do system prompt. */
const MAX_KB_CONTEXT_CHARS = 28_000;

export class KnowledgeBaseService {
  /**
   * Texto contínuo com todos os artigos (mais recentes primeiro), truncado por tamanho.
   * Usado no system prompt de respostas com IA.
   */
  static async getFormattedContextForPrompt(): Promise<string> {
    const rows = await prisma.knowledgeBase.findMany({
      select: { title: true, content: true, category: true },
      orderBy: { updated_at: 'desc' },
    });

    if (rows.length === 0) {
      return '(Nenhum artigo cadastrado na base de conhecimento.)';
    }

    const parts: string[] = [];
    let total = 0;
    for (const r of rows) {
      const cat = r.category ? ` [${r.category}]` : '';
      const block = `### ${r.title}${cat}\n${r.content}\n\n`;
      if (total + block.length > MAX_KB_CONTEXT_CHARS) {
        parts.push('\n[… demais artigos omitidos por limite de tamanho …]\n');
        break;
      }
      parts.push(block);
      total += block.length;
    }
    return parts.join('').trim();
  }
}
