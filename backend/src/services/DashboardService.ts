import { prisma } from '../prisma.js';
import type { DashboardOverview, DashboardStatsPeriod } from '../types/dashboard.js';
import {
  buildConversationsByDay,
  countMessagesInPeriod,
  dashboardChartRange,
  dashboardPeriodRange,
  dashboardPreviousPeriodRange,
  percentChange,
} from '../utils/dashboard.js';
import { EvolutionService } from './EvolutionService.js';
import { UserSettingService } from './UserSettingService.js';
import { WhatsAppService } from './WhatsAppService.js';

function isAiHandled(lastDirection: string | null, flowType: string | null | undefined): boolean {
  return lastDirection === 'out' && flowType !== 'handover';
}

export class DashboardService {
  private static async getWhatsappStatus(userId: string) {
    const channel = await UserSettingService.getWhatsappChannel(userId);
    const evolution = await EvolutionService.getInstanceStatus(userId);
    const official = await WhatsAppService.getStatus(userId);
    const connected =
      channel === 'official' ? official.connected : evolution.connectionStatus === 'CONNECTED';
    const connecting = channel === 'evolution' && evolution.connectionStatus === 'CONNECTING';
    const statusLabel = connected ? 'Conectado' : connecting ? 'Conectando' : 'Desconectado';
    return { connected, statusLabel };
  }

  private static async countConversationsInRange(userId: string, from: Date, to: Date) {
    return prisma.conversation.count({
      where: { user_id: userId, updated_at: { gte: from, lte: to } },
    });
  }

  private static async countMessagesInRange(userId: string, from: Date, to: Date) {
    const rows = await prisma.conversation.findMany({
      where: { user_id: userId, updated_at: { gte: from, lte: to } },
      select: { messages: true },
    });
    let total = 0;
    for (const row of rows) total += countMessagesInPeriod(row.messages, from, to);
    return total;
  }

  private static async computeAiResolutionPercent(userId: string, from: Date, to: Date) {
    const rows = await prisma.conversation.findMany({
      where: { user_id: userId, updated_at: { gte: from, lte: to } },
      select: {
        last_message_direction: true,
        active_flow: { select: { type: true } },
      },
    });
    if (rows.length === 0) return 0;
    const aiHandled = rows.filter((r) =>
      isAiHandled(r.last_message_direction, r.active_flow?.type),
    ).length;
    return Math.round((aiHandled / rows.length) * 100);
  }

  private static async countUniqueContactsInRange(userId: string, from: Date, to: Date) {
    const rows = await prisma.conversation.findMany({
      where: { user_id: userId, updated_at: { gte: from, lte: to } },
      select: { contact_id: true },
      distinct: ['contact_id'],
    });
    return rows.length;
  }

  static async getOverview(userId: string, period: DashboardStatsPeriod): Promise<DashboardOverview> {
    const { from, to } = dashboardPeriodRange(period);
    const { from: prevFrom, to: prevTo } = dashboardPreviousPeriodRange(period);
    const { from: chartFrom, dayCount } = dashboardChartRange(period);

    const [
      conversationsCount,
      prevConversationsCount,
      messagesCount,
      prevMessagesCount,
      newContactsCount,
      prevNewContactsCount,
      pendingCount,
      pendingAtPeriodStart,
      aiResolutionPercent,
      prevAiResolutionPercent,
      uniqueContacts,
      whatsapp,
      chartRows,
    ] = await Promise.all([
      this.countConversationsInRange(userId, from, to),
      this.countConversationsInRange(userId, prevFrom, prevTo),
      this.countMessagesInRange(userId, from, to),
      this.countMessagesInRange(userId, prevFrom, prevTo),
      prisma.userContact.count({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: { gte: from, lte: to },
        },
      }),
      prisma.userContact.count({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: { gte: prevFrom, lte: prevTo },
        },
      }),
      prisma.conversation.count({
        where: { user_id: userId, last_message_direction: 'in' },
      }),
      prisma.conversation.count({
        where: {
          user_id: userId,
          last_message_direction: 'in',
          updated_at: { lt: from },
        },
      }),
      this.computeAiResolutionPercent(userId, from, to),
      this.computeAiResolutionPercent(userId, prevFrom, prevTo),
      this.countUniqueContactsInRange(userId, from, to),
      this.getWhatsappStatus(userId),
      prisma.conversation.findMany({
        where: { user_id: userId, updated_at: { gte: chartFrom, lte: to } },
        select: { updated_at: true },
      }),
    ]);

    const conversationsByDay = buildConversationsByDay(
      chartRows.map((r) => r.updated_at).filter((d): d is Date => d !== null),
      chartFrom,
      dayCount,
    );

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      conversationsCount,
      conversationsChangePercent: percentChange(conversationsCount, prevConversationsCount),
      aiResolutionPercent,
      aiResolutionChangePercent: percentChange(aiResolutionPercent, prevAiResolutionPercent),
      newContactsCount,
      newContactsChangePercent: percentChange(newContactsCount, prevNewContactsCount),
      messagesCount,
      messagesChangePercent: percentChange(messagesCount, prevMessagesCount),
      pendingCount,
      pendingChangePercent: percentChange(pendingCount, pendingAtPeriodStart),
      whatsapp,
      conversationsByDay,
      summary: {
        totalConversations: conversationsCount,
        uniqueContacts,
        aiResolutionPercent,
        newContacts: newContactsCount,
        pendingConversations: pendingCount,
        whatsappConnected: whatsapp.connected,
      },
    };
  }
}
