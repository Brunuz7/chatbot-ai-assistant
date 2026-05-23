import { prisma } from '../lib/prisma.js';

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
      data: {
        blocked: false,
        block_reason: null,
        blocked_at: null,
        blocked_until: null,
      },
    });
  }

  private static contactInclude = {
    tag: {
      select: { id: true, name: true, color: true },
    },
  } as const;

  static async listActive(userId: string) {
    await UserContactService.releaseExpiredBlocks(userId);
    return prisma.userContact.findMany({
      where: {
        user_id: userId,
        blocked: false,
      },
      include: UserContactService.contactInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  static async listBlocked(userId: string) {
    return prisma.userContact.findMany({
      where: {
        user_id: userId,
        blocked: true,
      },
      include: UserContactService.contactInclude,
      orderBy: { updated_at: 'desc' },
    });
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
      data: {
        blocked: true,
        block_reason: input.reason || 'Bloqueado manualmente',
        blocked_at: new Date(),
        blocked_until: finalBlockedUntil,
      },
    });
  }

  static async unblockContact(userId: string, contactId: string) {
    await UserContactService.assertOwned(userId, contactId);

    return prisma.userContact.update({
      where: { id: contactId },
      data: {
        blocked: false,
        block_reason: null,
        blocked_at: null,
        blocked_until: null,
      },
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
      data: {
        user_id: userId,
        phone_number,
        whatsapp_id,
        name: input.name?.trim() || null,
        observation: input.observation?.trim() || null,
        tag_id,
      },
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
