import type { Prisma } from '@prisma/client';
import { conversationRetentionDays } from '../lib/conversationPolicy.js';
import { prisma, prismaRaw } from '../lib/prisma.js';

export type ConversationMessageDto = {
  direction: 'in' | 'out';
  content: string;
  timestamp: string;
};

export type ConversationListItem = {
  id: string;
  contactId: string;
  phoneNumber: string;
  whatsappId: string;
  contactName: string | null;
  messageCount: number;
  lastMessage: ConversationMessageDto | null;
  agentId: string | null;
  agentName: string | null;
  activeFlowId: string | null;
  activeFlowName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetail = ConversationListItem & {
  messages: ConversationMessageDto[];
  context: unknown;
};

export type ConversationListParams = {
  page?: number | string;
  limit?: number | string;
  search?: string;
};

export type PaginatedConversations = {
  items: ConversationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type StoredMessage = {
  direction?: string;
  content?: string;
  timestamp?: string;
};

const conversationSelect = {
  id: true,
  contact_id: true,
  phone_number: true,
  whatsapp_id: true,
  message_count: true,
  last_message_at: true,
  last_message_direction: true,
  last_message_preview: true,
  agent_id: true,
  active_flow_id: true,
  created_at: true,
  updated_at: true,
  agent: { select: { name: true } },
  active_flow: { select: { name: true } },
  contact: { select: { id: true, name: true, phone_number: true } },
} as const;

type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof conversationSelect }>;

function parsePage(raw: unknown, fallback = 1): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function parseLimit(raw: unknown, fallback = 20): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 100);
}

function parseMessages(raw: unknown): ConversationMessageDto[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessageDto[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as StoredMessage;
    const direction = o.direction === 'out' ? 'out' : o.direction === 'in' ? 'in' : null;
    if (!direction) continue;
    const content = String(o.content ?? '').trim() || '(sem texto)';
    let timestamp = new Date().toISOString();
    if (typeof o.timestamp === 'string' && o.timestamp.trim()) {
      const d = new Date(o.timestamp);
      if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
    }
    out.push({ direction, content, timestamp });
  }
  return out;
}

function lastMessageFromSummary(row: {
  last_message_at: Date | null;
  last_message_direction: string | null;
  last_message_preview: string | null;
}): ConversationMessageDto | null {
  if (!row.last_message_at || !row.last_message_direction) return null;
  const direction = row.last_message_direction === 'out' ? 'out' : 'in';
  return {
    direction,
    content: row.last_message_preview?.trim() || '(sem texto)',
    timestamp: row.last_message_at.toISOString(),
  };
}

export class ConversationService {
  private static buildListWhere(userId: string, search?: string): Prisma.ConversationWhereInput {
    let where: Prisma.ConversationWhereInput = { user_id: userId };

    const q = String(search ?? '').trim();
    if (!q) return where;

    where = {
      AND: [
        { user_id: userId },
        {
          OR: [
            { phone_number: { contains: q, mode: 'insensitive' } },
            { whatsapp_id: { contains: q, mode: 'insensitive' } },
            { last_message_preview: { contains: q, mode: 'insensitive' } },
            { contact: { name: { contains: q, mode: 'insensitive' } } },
            { contact: { phone_number: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ],
    };

    return where;
  }

  private static mapListRow(conv: ConversationRow): ConversationListItem {
    const contact = conv.contact;

    return {
      id: conv.id,
      contactId: conv.contact_id,
      phoneNumber: contact?.phone_number ?? conv.phone_number,
      whatsappId: conv.whatsapp_id,
      contactName: contact?.name?.trim() || null,
      messageCount: conv.message_count,
      lastMessage: lastMessageFromSummary(conv),
      agentId: conv.agent_id,
      agentName: conv.agent?.name?.trim() || null,
      activeFlowId: conv.active_flow_id,
      activeFlowName: conv.active_flow?.name?.trim() || null,
      createdAt: conv.created_at.toISOString(),
      updatedAt: conv.updated_at.toISOString(),
    };
  }

  static async listForUser(
    userId: string,
    params: ConversationListParams,
  ): Promise<PaginatedConversations> {
    const page = parsePage(params.page);
    const limit = parseLimit(params.limit);
    const search = params.search?.trim();

    const where = this.buildListWhere(userId, search);

    const [total, rows] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        select: conversationSelect,
        orderBy: { updated_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = total === 0 ? 1 : Math.min(page, totalPages);

    return {
      items: rows.map((row) => this.mapListRow(row)),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getByIdForUser(userId: string, id: string): Promise<ConversationDetail> {
    const conv = await prisma.conversation.findFirst({
      where: { id, user_id: userId },
      select: {
        ...conversationSelect,
        messages: true,
        context: true,
      },
    });

    if (!conv) throw new Error('not_found');

    const base = this.mapListRow(conv);
    const messages = parseMessages(conv.messages).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      ...base,
      messages,
      context: conv.context ?? null,
    };
  }

  static retentionCutoffDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - conversationRetentionDays());
    return d;
  }

  /** Remove conversas sem actividade há mais de N dias (por `updated_at`). */
  static async purgeExpired(): Promise<number> {
    const result = await prismaRaw.conversation.deleteMany({
      where: { updated_at: { lt: ConversationService.retentionCutoffDate() } },
    });
    return result.count;
  }

  private static retentionTimer: ReturnType<typeof setInterval> | null = null;

  static startRetentionWorker(): void {
    void ConversationService.purgeExpired();
    ConversationService.retentionTimer = setInterval(
      () => void ConversationService.runRetention(),
      6 * 60 * 60 * 1000,
    );
  }

  static stopRetentionWorker(): void {
    if (ConversationService.retentionTimer) {
      clearInterval(ConversationService.retentionTimer);
      ConversationService.retentionTimer = null;
    }
  }

  private static async runRetention(): Promise<void> {
    try {
      const removed = await ConversationService.purgeExpired();
      if (removed > 0) {
        console.log(
          `[conversation-retention] ${removed} conversa(s) removida(s) (>${conversationRetentionDays()} dias)`,
        );
      }
    } catch (err: unknown) {
      console.warn(
        '[conversation-retention] falha na limpeza:',
        err instanceof Error ? err.message : err,
      );
    }
  }
}
