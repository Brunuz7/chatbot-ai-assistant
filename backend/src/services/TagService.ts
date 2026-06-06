import { prisma } from '../prisma.js';
import { formatRecentConversationHistory } from '../utils/conversation.js';
import { emptyCurrentMessage } from '../constants/prompts.js';
import { OpenRouterService } from './OpenRouterService.js';
import { UserSettingService } from './UserSettingService.js';

export interface TagInput {
  name: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export class TagService {
  static async listByUser(userId: string) {
    return prisma.tag.findMany({
      where: { user_id: userId },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  static async listActiveForAutoTagging(userId: string) {
    return prisma.tag.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, description: true },
    });
  }

  static async createForUser(userId: string, data: TagInput) {
    const name = String(data.name ?? '').trim();
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

  static async updateForUser(userId: string, tagId: string, data: Partial<TagInput>) {
    const row = await prisma.tag.findFirst({
      where: { id: tagId, user_id: userId },
    });
    if (!row) throw new Error('not_found');

    const patch: {
      name?: string;
      description?: string | null;
      color?: string | null;
      sort_order?: number;
      is_active?: boolean;
    } = {};

    if (data.name !== undefined) {
      const name = String(data.name ?? '').trim();
      if (!name) throw new Error('invalid_input');
      const duplicate = await prisma.tag.findFirst({
        where: { user_id: userId, name: { equals: name, mode: 'insensitive' }, id: { not: tagId } },
      });
      if (duplicate) throw new Error('duplicate_name');
      patch.name = name;
    }
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    if (data.color !== undefined) patch.color = data.color?.trim() || null;
    if (data.sort_order !== undefined)
      patch.sort_order = Number.isFinite(data.sort_order) ? Number(data.sort_order) : 0;

    if (data.is_active !== undefined) patch.is_active = data.is_active;

    return prisma.tag.update({ where: { id: tagId }, data: patch });
  }

  static async deleteForUser(userId: string, tagId: string) {
    const row = await prisma.tag.findFirst({
      where: { id: tagId, user_id: userId },
    });
    if (!row) throw new Error('not_found');

    await prisma.userContact.updateMany({
      where: { user_id: userId, tag_id: tagId },
      data: { tag_id: null },
    });
    return prisma.tag.delete({ where: { id: tagId } });
  }

  /** Classificação automática por IA (não interrompe o fluxo da mensagem em caso de erro). */
  static async tagFromConversation(params: {
    userId: string;
    contactId: string;
    whatsappId: string;
    incomingText: string;
  }): Promise<void> {
    const { userId, contactId, whatsappId, incomingText } = params;

    const enabled = await UserSettingService.isTaggingEnabled(userId);
    if (!enabled) return;

    const tags = await TagService.listActiveForAutoTagging(userId);
    if (tags.length === 0) return;

    const historyBlock = await formatRecentConversationHistory(userId, whatsappId, incomingText);
    const currentText = String(incomingText ?? '').trim() || emptyCurrentMessage;

    let selectedTagId: string | null;
    try {
      selectedTagId = await OpenRouterService.classifyTagWithAI({
        tags,
        historyBlock,
        currentMessage: currentText,
      });
    } catch (err: unknown) {
      console.warn('TagService.classify: falha na IA:', err instanceof Error ? err.message : err);
      return;
    }

    if (!selectedTagId) return;

    const valid = tags.some((t) => t.id === selectedTagId);
    if (!valid) {
      console.warn('TagService.classify: tag inválida devolvida pela IA:', selectedTagId);
      return;
    }

    const contact = await prisma.userContact.findFirst({
      where: { id: contactId, user_id: userId },
      select: { tag_id: true },
    });
    if (!contact) return;
    if (contact.tag_id === selectedTagId) return;

    await prisma.userContact.update({ where: { id: contactId }, data: { tag_id: selectedTagId } });
  }
}
