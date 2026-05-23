import { prisma } from '../lib/prisma.js';
import { formatRecentConversationHistory } from '../lib/conversationHistory.js';
import { LeadTagService } from './LeadTagService.js';
import { OpenRouterService } from './OpenRouterService.js';
import { UserSettingService } from './UserSettingService.js';

export class LeadQualificationService {
  /**
   * Analisa o contexto da conversa e actualiza a tag do contacto quando a qualificação está activa.
   * Erros são registados mas não interrompem o processamento da mensagem.
   */
  static async qualifyContactFromConversation(params: {
    userId: string;
    contactId: string;
    whatsappId: string;
    incomingText: string;
  }): Promise<void> {
    const { userId, contactId, whatsappId, incomingText } = params;

    const enabled = await UserSettingService.isLeadQualificationEnabled(userId);
    if (!enabled) return;

    const tags = await LeadTagService.listActiveForQualification(userId);
    if (tags.length === 0) return;

    const historyBlock = await formatRecentConversationHistory(userId, whatsappId, incomingText);
    const currentText = String(incomingText ?? '').trim() || '(mensagem vazia)';

    let selectedTagId: string | null;
    try {
      selectedTagId = await OpenRouterService.classifyLeadTagWithAI({
        tags,
        historyBlock,
        currentMessage: currentText,
      });
    } catch (err: unknown) {
      console.warn(
        'LeadQualification: falha na IA:',
        err instanceof Error ? err.message : err,
      );
      return;
    }

    if (!selectedTagId) return;

    const valid = tags.some((t) => t.id === selectedTagId);
    if (!valid) {
      console.warn('LeadQualification: tag devolvida pela IA não pertence à conta:', selectedTagId);
      return;
    }

    const contact = await prisma.userContact.findFirst({
      where: { id: contactId, user_id: userId },
      select: { tag_id: true },
    });
    if (!contact) return;
    if (contact.tag_id === selectedTagId) return;

    await prisma.userContact.update({
      where: { id: contactId },
      data: { tag_id: selectedTagId },
    });
  }
}
