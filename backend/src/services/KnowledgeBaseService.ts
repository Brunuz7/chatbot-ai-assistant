import { prisma } from '../lib/prisma.js';

const MAX_RETRIEVAL_TOTAL_CHARS = 14_000;
const MAX_RETRIEVAL_ARTICLES = 14;
const MAX_CONTENT_PER_ARTICLE = 4_500;
const MAX_KEYWORDS = 40;

/** Palavras muito comuns em PT (amostra) — não contam para pontuação. */
const PT_STOPWORDS = new Set([
  'que', 'para', 'por', 'com', 'uma', 'uns', 'umas', 'não', 'mais', 'como', 'mas', 'foi', 'são', 'ser',
  'tem', 'seu', 'sua', 'seus', 'suas', 'pelo', 'pela', 'pelos', 'pelas', 'este', 'esta', 'isto', 'isso',
  'aquilo', 'entre', 'depois', 'antes', 'quando', 'onde', 'sobre', 'também', 'muito', 'pouco', 'todo', 'toda',
  'dos', 'das', 'num', 'numa', 'aos', 'nas', 'nos', 'já', 'ele', 'ela', 'eles', 'elas', 'meu', 'minha',
  'teu', 'tua', 'dele', 'dela', 'você', 'vocês', 'sim', 'pode', 'deve', 'fazer', 'favor', 'obrigado',
  'obrigada', 'porque', 'então', 'aqui', 'esse', 'essa', 'essa', 'qual', 'quais', 'quem', 'sendo', 'ter',
  'vez', 'dizer', 'coisa', 'assim', 'mesmo', 'mesma', 'outro', 'outra', 'desde', 'até', 'ainda', 'bem',
  'só', 'vai', 'tem', 'ter', 'está', 'estou', 'hoje', 'deus', 'ver', 'dar', 'fez', 'vou', 'era', 'sem',
]);

function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function extractKeywords(text: string): string[] {
  const norm = normalizeText(text);
  const parts = norm.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  const out: string[] = [];
  for (const w of parts) {
    if (PT_STOPWORDS.has(w)) continue;
    if (!out.includes(w)) out.push(w);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

function scoreArticle(
  row: { title: string; content: string; category: string | null },
  keywords: string[],
): number {
  const title = normalizeText(row.title);
  const blob = normalizeText(`${row.title} ${row.content}`);
  const cat = row.category ? normalizeText(row.category) : '';
  let score = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) score += 14;
    if (blob.includes(kw)) score += 3;
    if (cat && cat.includes(kw)) score += 8;
  }
  return score;
}

function truncateContent(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export class KnowledgeBaseService {
  /** Lista artigos da conta (mais recentes primeiro). */
  static async listByUser(userId: string) {
    return prisma.knowledgeBase.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  static async createForUser(userId: string, data: { title: string; content: string; category?: string | null }) {
    const title = data.title.trim();
    const content = data.content.trim();
    if (!title || !content) throw new Error('invalid_input');

    return prisma.knowledgeBase.create({
      data: { user_id: userId, title, content, category: data.category?.trim() || null },
    });
  }

  static async updateForUser(
    userId: string,
    id: string,
    data: { title?: string; content?: string; category?: string | null },
  ) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { id, user_id: userId },
    });
    if (!existing) throw new Error('not_found');

    return prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.content !== undefined ? { content: data.content.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
      },
    });
  }

  static async deleteForUser(userId: string, id: string) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { id, user_id: userId },
    });
    if (!existing) throw new Error('not_found');

    await prisma.knowledgeBase.delete({ where: { id } });
  }

  /**
   * Texto compacto para prompts: ordena por relevância face à mensagem / contexto
   * e trunca pelo tamanho total. Fallback: artigos mais recentes.
   */
  static async getRelevantFormattedForPrompt(userId: string, queryHint: string): Promise<string> {
    const rows = await prisma.knowledgeBase.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      take: 200,
    });

    if (rows.length === 0) {
      return '(Nenhum artigo cadastrado na base de conhecimento para esta conta.)';
    }

    const hint = queryHint.trim();
    const keywords = extractKeywords(hint);

    const scored = rows.map((r) => ({
      r,
      score: keywords.length ? scoreArticle(r, keywords) : 0,
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.r.updated_at.getTime() - a.r.updated_at.getTime();
    });

    let ordered: typeof rows;
    if (!keywords.length || scored[0].score === 0) {
      ordered = rows.slice(0, MAX_RETRIEVAL_ARTICLES);
    } else {
      ordered = scored.filter((s) => s.score > 0).map((s) => s.r);
      if (ordered.length === 0) ordered = rows.slice(0, MAX_RETRIEVAL_ARTICLES);
    }

    const parts: string[] = [];
    let total = 0;
    let used = 0;

    for (const r of ordered) {
      if (used >= MAX_RETRIEVAL_ARTICLES) break;
      const cat = r.category ? ` [${r.category}]` : '';
      const body = truncateContent(r.content, MAX_CONTENT_PER_ARTICLE);
      const block = `### ${r.title}${cat}\n${body}\n\n`;
      if (total + block.length > MAX_RETRIEVAL_TOTAL_CHARS) {
        parts.push('\n[… mais artigos omitidos por limite de tamanho do contexto …]\n');
        break;
      }
      parts.push(block);
      total += block.length;
      used++;
    }

    if (parts.length === 0) {
      return '(Não foi possível incluir trechos — tente reduzir o tamanho dos artigos.)';
    }

    return parts.join('').trim();
  }
}
