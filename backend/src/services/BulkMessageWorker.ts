import { prisma } from '../lib/prisma.js';
import {
  bulkMessageMaxAttempts,
  bulkMessageMaxSentPerDay,
  bulkMessagePollMs,
  bulkMessageRateLimitPauseMs,
  isLikelyRateLimitError,
  nextSendDelayMs,
  startOfUtcDay,
} from '../lib/bulkMessagePolicy.js';
import { buildMessagesUpdate, type ConversationMessageEntry } from '../lib/conversationMessages.js';
import { BulkMessageService } from './BulkMessageService.js';
import { EvolutionService } from './EvolutionService.js';

/** Último envio por instância Evolution (throttle em memória). */
const lastSendByInstance = new Map<string, number>();

export class BulkMessageWorker {
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static draining = false;
  private static started = false;

  static start(): void {
    if (this.started) return;
    this.started = true;
    const pollMs = bulkMessagePollMs();
    this.timer = setInterval(() => void this.tick(), pollMs);
    void this.tick();
    console.log(`[bulk-message] worker iniciado (poll ${pollMs}ms)`);
  }

  static stop(): void {
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static async tick(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      await this.activateDueCampaigns();
      await this.processOneDelivery();
    } catch (err: unknown) {
      console.warn(
        '[bulk-message] erro no ciclo:',
        err instanceof Error ? err.message : err,
      );
    } finally {
      this.draining = false;
    }
  }

  private static async activateDueCampaigns(): Promise<void> {
    const now = new Date();
    await prisma.bulkMessageCampaign.updateMany({
      where: {
        status: 'scheduled',
        scheduled_at: { lte: now },
      },
      data: { status: 'running', next_send_at: now },
    });

    await prisma.bulkMessageCampaign.updateMany({
      where: {
        status: 'paused',
        next_send_at: { lte: now },
      },
      data: { status: 'running', paused_reason: null, next_send_at: now },
    });
  }

  private static instanceCanSend(instanceName: string): boolean {
    const last = lastSendByInstance.get(instanceName) ?? 0;
    const elapsed = Date.now() - last;
    const minGap = nextSendDelayMs();
    return elapsed >= minGap;
  }

  private static markInstanceSent(instanceName: string): void {
    lastSendByInstance.set(instanceName, Date.now());
  }

  private static async dailySentForUser(userId: string): Promise<number> {
    const dayStart = startOfUtcDay();
    return prisma.bulkMessageDelivery.count({
      where: {
        status: 'sent',
        sent_at: { gte: dayStart },
        campaign: { user_id: userId },
      },
    });
  }

  private static async findNextDelivery() {
    const now = new Date();
    const campaigns = await prisma.bulkMessageCampaign.findMany({
      where: {
        status: 'running',
        OR: [{ next_send_at: null }, { next_send_at: { lte: now } }],
      },
      orderBy: [{ next_send_at: 'asc' }, { scheduled_at: 'asc' }],
      take: 20,
      select: { id: true, instance_name: true, user_id: true },
    });

    for (const c of campaigns) {
      if (!this.instanceCanSend(c.instance_name)) continue;

      const delivery = await prisma.bulkMessageDelivery.findFirst({
        where: { campaign_id: c.id, status: 'pending' },
        orderBy: { created_at: 'asc' },
        include: {
          campaign: {
            select: {
              id: true,
              user_id: true,
              message: true,
              instance_name: true,
              sent_count: true,
              failed_count: true,
              total_recipients: true,
            },
          },
        },
      });

      if (delivery) return delivery;
    }

    return null;
  }

  private static async completeCampaignIfDone(campaignId: string): Promise<void> {
    const pending = await prisma.bulkMessageDelivery.count({
      where: { campaign_id: campaignId, status: 'pending' },
    });
    if (pending > 0) return;

    await prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: { status: 'completed', next_send_at: null },
    });
  }

  private static async appendOutbound(
    userId: string,
    contactId: string,
    whatsappId: string,
    phoneNumber: string,
    content: string,
  ): Promise<void> {
    const entry: ConversationMessageEntry = {
      direction: 'out',
      content,
      timestamp: new Date().toISOString(),
    };

    const existing = await prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
      select: { id: true, messages: true, contact_id: true },
    });

    if (existing) {
      const patch = buildMessagesUpdate(existing.messages, entry);
      await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          contact_id: existing.contact_id ?? contactId,
          messages: patch.messages as object,
          message_count: patch.message_count,
          last_message_at: patch.last_message_at,
          last_message_direction: patch.last_message_direction,
          last_message_preview: patch.last_message_preview,
        },
      });
      return;
    }

    const patch = buildMessagesUpdate([], entry);
    await prisma.conversation.create({
      data: {
        user_id: userId,
        contact_id: contactId,
        phone_number: phoneNumber,
        whatsapp_id: whatsappId,
        messages: patch.messages as object,
        message_count: patch.message_count,
        last_message_at: patch.last_message_at,
        last_message_direction: patch.last_message_direction,
        last_message_preview: patch.last_message_preview,
      },
    });
  }

  private static async pauseCampaign(campaignId: string, reason: string): Promise<void> {
    const resumeAt = new Date(Date.now() + bulkMessageRateLimitPauseMs());
    await prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'paused',
        paused_reason: reason,
        next_send_at: resumeAt,
      },
    });
  }

  private static async processOneDelivery(): Promise<void> {
    const delivery = await this.findNextDelivery();
    if (!delivery) return;

    const campaign = delivery.campaign;
    const userId = campaign.user_id;
    const instanceName = campaign.instance_name;

    const sentToday = await this.dailySentForUser(userId);
    if (sentToday >= bulkMessageMaxSentPerDay()) {
      await this.pauseCampaign(
        campaign.id,
        `Limite diário de ${bulkMessageMaxSentPerDay()} envios atingido. Retoma amanhã.`,
      );
      return;
    }

    const contact = await prisma.userContact.findUnique({
      where: { id: delivery.contact_id },
      select: { blocked: true, deleted_at: true },
    });

    if (!contact || contact.blocked || contact.deleted_at) {
      await prisma.bulkMessageDelivery.update({
        where: { id: delivery.id },
        data: { status: 'skipped', last_error: 'Contato bloqueado ou removido' },
      });
      await prisma.bulkMessageCampaign.update({
        where: { id: campaign.id },
        data: { skipped_count: { increment: 1 } },
      });
      await this.completeCampaignIfDone(campaign.id);
      return;
    }

    const number = BulkMessageService.recipientNumber(
      delivery.whatsapp_id || '',
      delivery.phone_number,
    );
    const whatsappId = delivery.whatsapp_id || `${delivery.phone_number}@s.whatsapp.net`;

    await prisma.bulkMessageDelivery.update({
      where: { id: delivery.id },
      data: { attempt_count: { increment: 1 } },
    });

    let sendOk = false;
    let errorMsg = '';
    let httpStatus: number | undefined;

    try {
      const result = await EvolutionService.sendMessage(instanceName, {
        number,
        text: campaign.message,
        delay: 1500,
        linkPreview: false,
      });
      sendOk = Boolean(result);
      if (!sendOk) errorMsg = 'Evolution API não confirmou o envio';
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      httpStatus = anyErr.response?.status;
      errorMsg =
        typeof anyErr.response?.data === 'string'
          ? anyErr.response.data
          : JSON.stringify(anyErr.response?.data ?? anyErr.message ?? 'erro');
      sendOk = false;
    }

    const now = new Date();
    const nextAt = new Date(now.getTime() + nextSendDelayMs());

    if (sendOk) {
      this.markInstanceSent(instanceName);
      await prisma.bulkMessageDelivery.update({
        where: { id: delivery.id },
        data: { status: 'sent', sent_at: now, last_error: null },
      });
      await prisma.bulkMessageCampaign.update({
        where: { id: campaign.id },
        data: {
          sent_count: { increment: 1 },
          last_sent_at: now,
          next_send_at: nextAt,
        },
      });

      try {
        await this.appendOutbound(
          userId,
          delivery.contact_id,
          whatsappId,
          delivery.phone_number,
          campaign.message,
        );
      } catch {
        /* histórico é secundário */
      }
    } else {
      const attempts = delivery.attempt_count + 1;
      const rateLimited = isLikelyRateLimitError(errorMsg, httpStatus);

      if (rateLimited) {
        await this.pauseCampaign(
          campaign.id,
          'Possível limite do WhatsApp detectado. Campanha pausada automaticamente por 1 hora.',
        );
        await prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: { last_error: errorMsg.slice(0, 500) },
        });
        return;
      }

      if (attempts >= bulkMessageMaxAttempts()) {
        await prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: { status: 'failed', last_error: errorMsg.slice(0, 500) },
        });
        await prisma.bulkMessageCampaign.update({
          where: { id: campaign.id },
          data: { failed_count: { increment: 1 }, next_send_at: nextAt },
        });
      } else {
        await prisma.bulkMessageDelivery.update({
          where: { id: delivery.id },
          data: { last_error: errorMsg.slice(0, 500) },
        });
        await prisma.bulkMessageCampaign.update({
          where: { id: campaign.id },
          data: { next_send_at: nextAt },
        });
      }
    }

    await this.completeCampaignIfDone(campaign.id);
  }
}
