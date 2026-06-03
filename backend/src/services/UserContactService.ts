import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { withNotDeleted } from '../lib/softDelete.js';

export interface BlockContactInput {
  reason?: string;
  blockHours?: number;
  blockedUntil?: string;
}

export interface UpsertContactInput {
  name?: string | null;
  phone_number: string;
  observation?: string | null;
  whatsapp_id?: string | null;
  tag_id?: string | null;
}

export type ContactListParams = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  tag_id?: string;
};

export type ContactConversationDto = {
  id: string;
  messageCount: number;
  lastMessage: {
    direction: 'in' | 'out';
    content: string;
    timestamp: string;
  } | null;
  updatedAt: string;
  agentName: string | null;
  activeFlowName: string | null;
};

export type ContactListItemDto = {
  id: string;
  phone_number: string;
  whatsapp_id: string | null;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  block_reason: string | null;
  blocked_at: string | null;
  blocked_until: string | null;
  name: string | null;
  observation: string | null;
  tag_id: string | null;
  tag: { id: string; name: string; color: string | null } | null;
  conversation: ContactConversationDto | null;
};

export type PaginatedContacts = {
  items: ContactListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    active: number;
    blocked: number;
  };
};

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

function lastMessageFromConversation(row: {
  last_message_at: Date | null;
  last_message_direction: string | null;
  last_message_preview: string | null;
}): ContactConversationDto['lastMessage'] {
  if (!row.last_message_at || !row.last_message_direction) return null;
  const direction = row.last_message_direction === 'out' ? 'out' : 'in';
  return {
    direction,
    content: row.last_message_preview?.trim() || '(sem texto)',
    timestamp: row.last_message_at.toISOString(),
  };
}

const conversationSelect = {
  id: true,
  message_count: true,
  last_message_at: true,
  last_message_direction: true,
  last_message_preview: true,
  updated_at: true,
  agent: { select: { name: true } },
  active_flow: { select: { name: true } },
} as const;

type ContactRow = Prisma.UserContactGetPayload<{
  include: {
    tag: { select: { id: true; name: true; color: true } };
    conversations: { select: typeof conversationSelect };
  };
}>;

export class UserContactService {
  /** Normaliza número ou JID WhatsApp para armazenamento (apenas dígitos). */
  static normalizePhone(raw: string): string {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';
    const local = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    return local.replace(/\D/g, '');
  }

  private static async assertOwned(userId: string, contactId: string) {
    const existing = await prisma.userContact.findFirst({
      where: { id: contactId, user_id: userId },
    });
    if (!existing) throw new Error('not_found');
    return existing;
  }
  /** Desbloqueia automaticamente contatos com prazo já expirado. */
  private static async releaseExpiredBlocks(userId: string) {
    await prisma.userContact.updateMany({
      where: {
        user_id: userId,
        blocked: true,
        blocked_until: {
          not: null,
          lte: new Date(),
        },
      },
      data: { blocked: false, block_reason: null, blocked_at: null, blocked_until: null },
    });
  }

  private static contactInclude = {
    tag: {
      select: { id: true, name: true, color: true },
    },
    conversations: {
      take: 1,
      orderBy: { updated_at: 'desc' as const },
      select: conversationSelect,
    },
  } as const;

  private static excludeGroupContacts(): Prisma.UserContactWhereInput {
    return {
      NOT: [
        { whatsapp_id: { endsWith: '@g.us' } },
        { whatsapp_id: { contains: 'broadcast' } },
      ],
    };
  }

  private static buildListWhere(
    userId: string,
    blocked: boolean,
    search?: string,
    tagId?: string,
  ): Prisma.UserContactWhereInput {
    let where: Prisma.UserContactWhereInput = withNotDeleted({
      user_id: userId,
      blocked,
      ...UserContactService.excludeGroupContacts(),
    });

    const q = String(search ?? '').trim();
    if (q) {
      where = {
        AND: [
          where,
          {
            OR: [
              { phone_number: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { observation: { contains: q, mode: 'insensitive' } },
              { tag: { name: { contains: q, mode: 'insensitive' } } },
              {
                conversations: {
                  some: { last_message_preview: { contains: q, mode: 'insensitive' } },
                },
              },
            ],
          },
        ],
      };
    }

    const tag = String(tagId ?? '').trim();
    if (tag === '__none__') {
      where = { AND: [where, { tag_id: null }] };
    } else if (tag) {
      where = { AND: [where, { tag_id: tag }] };
    }

    return where;
  }

  private static mapContactRow(row: ContactRow): ContactListItemDto {
    const conv = row.conversations[0];
    const conversation: ContactConversationDto | null = conv
      ? {
          id: conv.id,
          messageCount: conv.message_count,
          lastMessage: lastMessageFromConversation(conv),
          updatedAt: conv.updated_at.toISOString(),
          agentName: conv.agent?.name?.trim() || null,
          activeFlowName: conv.active_flow?.name?.trim() || null,
        }
      : null;

    return {
      id: row.id,
      phone_number: row.phone_number,
      whatsapp_id: row.whatsapp_id,
      blocked: row.blocked,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      block_reason: row.block_reason,
      blocked_at: row.blocked_at?.toISOString() ?? null,
      blocked_until: row.blocked_until?.toISOString() ?? null,
      name: row.name,
      observation: row.observation,
      tag_id: row.tag_id,
      tag: row.tag,
      conversation,
    };
  }

  private static async countByTab(userId: string) {
    const activeWhere = UserContactService.buildListWhere(userId, false);
    const blockedWhere = UserContactService.buildListWhere(userId, true);
    const [active, blocked] = await Promise.all([
      prisma.userContact.count({ where: activeWhere }),
      prisma.userContact.count({ where: blockedWhere }),
    ]);
    return { active, blocked };
  }

  static async listPaginated(
    userId: string,
    blocked: boolean,
    params: ContactListParams,
  ): Promise<PaginatedContacts> {
    if (!blocked) {
      await UserContactService.releaseExpiredBlocks(userId);
    }

    const page = parsePage(params.page);
    const limit = parseLimit(params.limit);
    const search = params.search?.trim();
    const where = UserContactService.buildListWhere(userId, blocked, search, params.tag_id);

    const [total, rows, counts] = await Promise.all([
      prisma.userContact.count({ where }),
      prisma.userContact.findMany({
        where,
        include: UserContactService.contactInclude,
        orderBy: { updated_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      UserContactService.countByTab(userId),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = total === 0 ? 1 : Math.min(page, totalPages);

    return {
      items: rows.map((row) => UserContactService.mapContactRow(row)),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      counts,
    };
  }

  static async listActive(userId: string) {
    await UserContactService.releaseExpiredBlocks(userId);
    return prisma.userContact.findMany({
      where: withNotDeleted({
        user_id: userId,
        blocked: false,
        ...UserContactService.excludeGroupContacts(),
      }),
      include: UserContactService.contactInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  static async listBlocked(userId: string) {
    return prisma.userContact.findMany({
      where: withNotDeleted({
        user_id: userId,
        blocked: true,
        ...UserContactService.excludeGroupContacts(),
      }),
      include: UserContactService.contactInclude,
      orderBy: { updated_at: 'desc' },
    });
  }

  /** Bloqueio legado por número (cria contacto se não existir). */
  static async blockByPhone(userId: string, phoneNumber: string, observation?: string) {
    const exists = await prisma.userContact.findFirst({
      where: { phone_number: phoneNumber, user_id: userId },
    });

    if (exists?.blocked) throw new Error('already_blocked');

    if (exists) {
      return prisma.userContact.update({
        where: { id: exists.id },
        data: { blocked: true, observation },
      });
    }

    return prisma.userContact.create({ data: { phone_number: phoneNumber, observation, blocked: true, user_id: userId } });
  }

  private static resolveBlockedUntil(input: BlockContactInput): Date {
    const { blockedUntil, blockHours } = input;

    if (blockedUntil) {
      const d = new Date(blockedUntil);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }

    if (blockHours !== undefined && blockHours !== null) {
      const h = Number(blockHours);
      if (!Number.isNaN(h) && h !== 0) {
        const end = new Date();
        end.setHours(end.getHours() + h);
        return end;
      }
    }

    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 24);
    return fallback;
  }

  static async blockContact(userId: string, contactId: string, input: BlockContactInput) {
    await UserContactService.assertOwned(userId, contactId);

    const finalBlockedUntil = UserContactService.resolveBlockedUntil(input);

    return prisma.userContact.update({
      where: { id: contactId },
      data: { blocked: true, block_reason: input.reason || 'Bloqueado manualmente', blocked_at: new Date(), blocked_until: finalBlockedUntil },
    });
  }

  static async unblockContact(userId: string, contactId: string) {
    await UserContactService.assertOwned(userId, contactId);

    return prisma.userContact.update({
      where: { id: contactId },
      data: { blocked: false, block_reason: null, blocked_at: null, blocked_until: null },
    });
  }

  static async create(userId: string, input: UpsertContactInput) {
    const phone_number = UserContactService.normalizePhone(input.phone_number);
    if (!phone_number) throw new Error('invalid_phone');

    const duplicate = await prisma.userContact.findFirst({
      where: { user_id: userId, phone_number },
    });
    if (duplicate) throw new Error('duplicate_phone');

    const whatsapp_id =
      input.whatsapp_id?.trim() ||
      `${phone_number}@s.whatsapp.net`;

    const tag_id = await UserContactService.resolveLeadTagId(userId, input.tag_id);

    return prisma.userContact.create({
      data: { user_id: userId, phone_number, whatsapp_id, name: input.name?.trim() || null, observation: input.observation?.trim() || null, tag_id },
      include: UserContactService.contactInclude,
    });
  }

  private static async resolveLeadTagId(
    userId: string,
    leadTagId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (leadTagId === undefined) return undefined;
    if (leadTagId === null || leadTagId === '') return null;
    const tag = await prisma.tag.findFirst({
      where: { id: leadTagId, user_id: userId },
    });
    if (!tag) throw new Error('invalid_tag');
    return leadTagId;
  }

  static async update(userId: string, contactId: string, input: Partial<UpsertContactInput>) {
    const existing = await UserContactService.assertOwned(userId, contactId);

    const data: {
      name?: string | null;
      phone_number?: string;
      observation?: string | null;
      whatsapp_id?: string | null;
      tag_id?: string | null;
    } = {};

    if (input.name !== undefined) {
      data.name = input.name?.trim() || null;
    }
    if (input.observation !== undefined) {
      data.observation = input.observation?.trim() || null;
    }
    if (input.phone_number !== undefined) {
      const phone_number = UserContactService.normalizePhone(input.phone_number);
      if (!phone_number) throw new Error('invalid_phone');
      if (phone_number !== existing.phone_number) {
        const duplicate = await prisma.userContact.findFirst({
          where: { user_id: userId, phone_number, id: { not: contactId } },
        });
        if (duplicate) throw new Error('duplicate_phone');
        data.phone_number = phone_number;
        data.whatsapp_id =
          input.whatsapp_id?.trim() || `${phone_number}@s.whatsapp.net`;
      }
    } else if (input.whatsapp_id !== undefined) {
      data.whatsapp_id = input.whatsapp_id?.trim() || null;
    }
    if (input.tag_id !== undefined) {
      data.tag_id = await UserContactService.resolveLeadTagId(userId, input.tag_id);
    }

    return prisma.userContact.update({
      where: { id: contactId },
      data,
      include: UserContactService.contactInclude,
    });
  }

  static async delete(userId: string, contactId: string) {
    await UserContactService.assertOwned(userId, contactId);
    return prisma.userContact.delete({ where: { id: contactId } });
  }
}
