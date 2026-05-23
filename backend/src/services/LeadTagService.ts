import { prisma } from '../lib/prisma.js';

export interface LeadTagInput {
  name: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export class LeadTagService {
  private static normalizeName(name: string): string {
    return String(name ?? '').trim();
  }

  private static async assertOwned(userId: string, tagId: string) {
    const row = await prisma.tag.findFirst({
      where: { id: tagId, user_id: userId },
    });
    if (!row) throw new Error('not_found');
    return row;
  }

  static async listByUser(userId: string) {
    return prisma.tag.findMany({
      where: { user_id: userId },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  static async listActiveForQualification(userId: string) {
    return prisma.tag.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, description: true },
    });
  }

  static async createForUser(userId: string, data: LeadTagInput) {
    const name = LeadTagService.normalizeName(data.name);
    if (!name) throw new Error('invalid_input');

    const duplicate = await prisma.tag.findFirst({
      where: { user_id: userId, name: { equals: name, mode: 'insensitive' } },
    });
    if (duplicate) throw new Error('duplicate_name');

    return prisma.tag.create({
      data: {
        user_id: userId,
        name,
        description: data.description?.trim() || null,
        color: data.color?.trim() || null,
        sort_order: Number.isFinite(data.sort_order) ? Number(data.sort_order) : 0,
        is_active: data.is_active !== false,
      },
    });
  }

  static async updateForUser(userId: string, tagId: string, data: Partial<LeadTagInput>) {
    await LeadTagService.assertOwned(userId, tagId);

    const patch: {
      name?: string;
      description?: string | null;
      color?: string | null;
      sort_order?: number;
      is_active?: boolean;
    } = {};

    if (data.name !== undefined) {
      const name = LeadTagService.normalizeName(data.name);
      if (!name) throw new Error('invalid_input');
      const duplicate = await prisma.tag.findFirst({
        where: {
          user_id: userId,
          name: { equals: name, mode: 'insensitive' },
          id: { not: tagId },
        },
      });
      if (duplicate) throw new Error('duplicate_name');
      patch.name = name;
    }
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    if (data.color !== undefined) patch.color = data.color?.trim() || null;
    if (data.sort_order !== undefined) {
      patch.sort_order = Number.isFinite(data.sort_order) ? Number(data.sort_order) : 0;
    }
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    return prisma.tag.update({ where: { id: tagId }, data: patch });
  }

  static async deleteForUser(userId: string, tagId: string) {
    await LeadTagService.assertOwned(userId, tagId);
    await prisma.userContact.updateMany({
      where: { user_id: userId, tag_id: tagId },
      data: { tag_id: null },
    });
    return prisma.tag.delete({ where: { id: tagId } });
  }
}
