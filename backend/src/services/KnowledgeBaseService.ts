import { prisma } from '../prisma.js';
import { StoreService } from './StoreService.js';
import { PlanService } from './PlanService.js';
import { knowledgeEmpty, knowledgeExtractFailed, knowledgeTruncated } from '../constants/prompts.js';

const MAX_RETRIEVAL_TOTAL_CHARS = 14_000;
const MAX_RETRIEVAL_ARTICLES = 14;
const MAX_CONTENT_PER_ARTICLE = 4_500;
const MAX_KEYWORDS = 40;

/** Máximo de caracteres ao gravar um artigo (conteúdo). */
export const KNOWLEDGE_CONTENT_MAX_LENGTH = 5_000;

/** Palavras muito comuns em PT (amostra) — não contam para pontuação. */
const PT_STOPWORDS = new Set([
  'que',
  'para',
  'por',
  'com',
  'uma',
  'uns',
  'umas',
  'não',
  'mais',
  'como',
  'mas',
  'foi',
  'são',
  'ser',
  'tem',
  'seu',
  'sua',
  'seus',
  'suas',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'este',
  'esta',
  'isto',
  'isso',
  'aquilo',
  'entre',
  'depois',
  'antes',
  'quando',
  'onde',
  'sobre',
  'também',
  'muito',
  'pouco',
  'todo',
  'toda',
  'dos',
  'das',
  'num',
  'numa',
  'aos',
  'nas',
  'nos',
  'já',
  'ele',
  'ela',
  'eles',
  'elas',
  'meu',
  'minha',
  'teu',
  'tua',
  'dele',
  'dela',
  'você',
  'vocês',
  'sim',
  'pode',
  'deve',
  'fazer',
  'favor',
  'obrigado',
  'obrigada',
  'porque',
  'então',
  'aqui',
  'esse',
  'essa',
  'essa',
  'qual',
  'quais',
  'quem',
  'sendo',
  'ter',
  'vez',
  'dizer',
  'coisa',
  'assim',
  'mesmo',
  'mesma',
  'outro',
  'outra',
  'desde',
  'até',
  'ainda',
  'bem',
  'só',
  'vai',
  'tem',
  'ter',
  'está',
  'estou',
  'hoje',
  'deus',
  'ver',
  'dar',
  'fez',
  'vou',
  'era',
  'sem',
]);

function normalizeText(raw: string): string {
  return raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
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

function scoreArticle(row: { title: string; content: string; category: string | null }, keywords: string[]): number {
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

function normalizeArticleContent(raw: string): string {
  const content = String(raw ?? '').trim();
  if (!content) throw new Error('invalid_input');
  if (content.length > KNOWLEDGE_CONTENT_MAX_LENGTH) throw new Error('content_too_long');
  return content;
}

const STORE_CATALOG_FORMAT = /^(json|csv|toon)\n/s;

function assertStoreCatalogContent(content: string) {
  if (!STORE_CATALOG_FORMAT.test(content)) throw new Error('invalid_store_catalog');
}

function normalizeArticleTitle(raw: string): string {
  const title = String(raw ?? '').trim();
  if (!title) throw new Error('invalid_input');
  return title;
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
    await PlanService.assertLimit(userId, 'knowledge_bases');
    const title = normalizeArticleTitle(data.title);
    const content = normalizeArticleContent(data.content);
    const category = data.category?.trim() || null;
    if (category === StoreService.category) assertStoreCatalogContent(content);

    return prisma.knowledgeBase.create({
      data: { user_id: userId, title, content, category },
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

    const nextContent = data.content !== undefined ? normalizeArticleContent(data.content) : undefined;
    const nextCategory = data.category !== undefined ? data.category?.trim() || null : existing.category;
    if (nextCategory === StoreService.category && nextContent) assertStoreCatalogContent(nextContent);

    return prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: normalizeArticleTitle(data.title) } : {}),
        ...(data.content !== undefined ? { content: normalizeArticleContent(data.content) } : {}),
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
   * Texto compacto para prompts: o catálogo da loja integrada entra sempre (se existir),
   * só com nome/preço/descrição — referências de imagem ficam fora do contexto da IA;
   * demais artigos são ordenados por relevância e truncados pelo tamanho total.
   */
  static async getRelevantFormattedForPrompt(userId: string, queryHint: string): Promise<string> {
    const rows = await prisma.knowledgeBase.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      take: 200,
    });

    if (rows.length === 0) return knowledgeEmpty;

    const storeRow = rows.find((r) => r.category === StoreService.category) ?? null;
    const knowledgeRows = storeRow ? rows.filter((r) => r.id !== storeRow.id) : rows;

    const hint = queryHint.trim();
    const keywords = extractKeywords(hint);

    const scored = knowledgeRows.map((r) => ({
      r,
      score: keywords.length ? scoreArticle(r, keywords) : 0,
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.r.updated_at.getTime() - a.r.updated_at.getTime();
    });

    let rankedKnowledge: typeof knowledgeRows;
    if (!keywords.length || scored.length === 0 || scored[0].score === 0) {
      rankedKnowledge = knowledgeRows.slice(0, MAX_RETRIEVAL_ARTICLES);
    } else {
      rankedKnowledge = scored.filter((s) => s.score > 0).map((s) => s.r);
      if (rankedKnowledge.length === 0) rankedKnowledge = knowledgeRows.slice(0, MAX_RETRIEVAL_ARTICLES);
    }

    const ordered: typeof rows = storeRow ? [storeRow, ...rankedKnowledge] : rankedKnowledge;

    const parts: string[] = [];
    let total = 0;
    let used = 0;

    for (const r of ordered) {
      if (used >= MAX_RETRIEVAL_ARTICLES) break;
      const cat = r.category ? ` [${r.category}]` : '';
      const rawBody = r.category === StoreService.category ? StoreService.formatCatalogForPrompt(r.content) : r.content;
      const body = truncateContent(rawBody, MAX_CONTENT_PER_ARTICLE);
      const block = `### ${r.title}${cat}\n${body}\n\n`;
      if (total + block.length > MAX_RETRIEVAL_TOTAL_CHARS) {
        parts.push(knowledgeTruncated);
        break;
      }
      parts.push(block);
      total += block.length;
      used++;
    }

    if (parts.length === 0) return knowledgeExtractFailed;

    return parts.join('').trim();
  }
}
