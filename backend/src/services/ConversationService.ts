import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationListParams,
  PaginatedConversations,
} from '../types/conversation.js';
import { lastMessageFromSummary, parseMessages } from '../utils/conversation.js';
import { parseLimit, parsePage } from '../utils/pagination.js';

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

export class ConversationService {
  private static buildListWhere(userId: string, search?: string): Prisma.ConversationWhereInput {
    const q = String(search ?? '').trim();
    if (!q) return { user_id: userId };

    return {
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

  static async listForUser(userId: string, params: ConversationListParams): Promise<PaginatedConversations> {
    const page = parsePage(params.page);
    const limit = parseLimit(params.limit);
    const where = this.buildListWhere(userId, params.search?.trim());

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
      pagination: { page: safePage, limit, total, totalPages },
    };
  }

  static async getByIdForUser(userId: string, id: string): Promise<ConversationDetail> {
    const conv = await prisma.conversation.findFirst({
      where: { id, user_id: userId },
      select: { ...conversationSelect, messages: true, context: true },
    });

    if (!conv) throw new Error('not_found');

    const messages = parseMessages(conv.messages).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return { ...this.mapListRow(conv), messages, context: conv.context ?? null };
  }
}
