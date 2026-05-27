import type { BulkMessageCampaign, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { withNotDeleted } from '../lib/softDelete.js';
import {
  bulkMessageMaxAttempts,
  bulkMessageMaxCampaignsPerDay,
  bulkMessageMaxRecipientsPerCampaign,
  bulkMessageMaxSentPerDay,
  bulkMessageMaxTextLength,
  bulkMessageMinScheduleAheadMinutes,
  bulkMessagePollMs,
  bulkMessageRateLimitPauseMs,
  isLikelyRateLimitError,
  nextSendDelayMs,
  startOfUtcDay,
} from '../lib/bulkMessagePolicy.js';
import { buildMessagesUpdate, type ConversationMessageEntry } from '../lib/conversationMessages.js';
import { ConnectionService } from './ConnectionService.js';
import { UserContactService } from './UserContactService.js';

const lastSendByInstance = new Map<string, number>();

export type CreateBulkCampaignInput = {
  name?: string | null;
  message: string;
  tag_ids?: string[];
  scheduled_at: string;
};

export type BulkCampaignLimits = {
  maxRecipientsPerCampaign: number;
  maxCampaignsPerDay: number;
  maxSentPerDay: number;
  minScheduleAheadMinutes: number;
  intervalSeconds: number;
  campaignsCreatedToday: number;
  messagesSentToday: number;
};

function parseTagIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function isGroupOrBroadcast(whatsappId: string | null | undefined, phone: string): boolean {
  const id = whatsappId || '';
  if (id.endsWith('@g.us') || id.includes('broadcast')) return true;
  return phone.length > 15;
}

export class BulkMessageService {
  static async getLimits(userId: string): Promise<BulkCampaignLimits> {
    const dayStart = startOfUtcDay();
    const [campaignsToday, sentToday] = await Promise.all([
      prisma.bulkMessageCampaign.count({
        where: { user_id: userId, created_at: { gte: dayStart } },
      }),
      prisma.bulkMessageDelivery.count({
        where: {
          status: 'sent',
          sent_at: { gte: dayStart },
          campaign: { user_id: userId },
        },
      }),
    ]);

    return {
      maxRecipientsPerCampaign: bulkMessageMaxRecipientsPerCampaign(),
      maxCampaignsPerDay: bulkMessageMaxCampaignsPerDay(),
      maxSentPerDay: bulkMessageMaxSentPerDay(),
      minScheduleAheadMinutes: bulkMessageMinScheduleAheadMinutes(),
      intervalSeconds: Math.round(
        (Number(process.env.BULK_MESSAGE_INTERVAL_MS) || 30_000) / 1000,
      ),
      campaignsCreatedToday: campaignsToday,
      messagesSentToday: sentToday,
    };
  }

  static async listByUser(userId: string) {
    return prisma.bulkMessageCampaign.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        message: true,
        tag_ids: true,
        scheduled_at: true,
        status: true,
        instance_name: true,
        total_recipients: true,
        sent_count: true,
        failed_count: true,
        skipped_count: true,
        last_sent_at: true,
        next_send_at: true,
        paused_reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  static async getById(userId: string, campaignId: string) {
    const campaign = await prisma.bulkMessageCampaign.findFirst({
      where: { id: campaignId, user_id: userId },
      include: {
        deliveries: {
          orderBy: { created_at: 'asc' },
          take: 500,
          select: {
            id: true,
            contact_id: true,
            phone_number: true,
            whatsapp_id: true,
            status: true,
            last_error: true,
            sent_at: true,
            contact: { select: { name: true, tag: { select: { id: true, name: true, color: true } } } },
          },
        },
      },
    });
    if (!campaign) throw new Error('not_found');
    return campaign;
  }

  private static async assertDailyCampaignQuota(userId: string) {
    const limits = await this.getLimits(userId);
    if (limits.campaignsCreatedToday >= limits.maxCampaignsPerDay) {
      throw new Error('daily_campaign_limit');
    }
  }

  private static async resolveRecipients(
    userId: string,
    tagIds: string[],
  ): Promise<
    Array<{ id: string; phone_number: string; whatsapp_id: string | null; blocked: boolean }>
  > {
    const where: Prisma.UserContactWhereInput = withNotDeleted({
      user_id: userId,
      blocked: false,
    });

    if (tagIds.length > 0) {
      where.tag_id = { in: tagIds };
    }

    const contacts = await prisma.userContact.findMany({
      where,
      select: { id: true, phone_number: true, whatsapp_id: true, blocked: true },
      orderBy: { created_at: 'asc' },
    });

    return contacts.filter(
      (c) => !isGroupOrBroadcast(c.whatsapp_id, c.phone_number) && c.phone_number.length >= 8,
    );
  }

  static async create(userId: string, input: CreateBulkCampaignInput) {
    await this.assertDailyCampaignQuota(userId);

    const message = String(input.message ?? '').trim();
    if (!message) throw new Error('invalid_message');
    if (message.length > bulkMessageMaxTextLength()) throw new Error('message_too_long');

    const scheduledAt = new Date(input.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) throw new Error('invalid_schedule');

    const minAhead = bulkMessageMinScheduleAheadMinutes() * 60 * 1000;
    if (scheduledAt.getTime() < Date.now() + minAhead) {
      throw new Error('schedule_too_soon');
    }

    const tagIds = [...new Set(parseTagIds(input.tag_ids ?? []))];
    if (tagIds.length > 0) {
      const owned = await prisma.tag.count({
        where: withNotDeleted({ user_id: userId, id: { in: tagIds } }),
      });
      if (owned !== tagIds.length) throw new Error('invalid_tags');
    }

    const overview = await ConnectionService.getOverview(userId);
    if (overview.whatsapp_channel === 'official') {
      throw new Error('bulk_requires_evolution_channel');
    }
    if (!overview.evolution.connected) {
      throw new Error('whatsapp_disconnected');
    }
    const statusInfo = overview.evolution;

    let recipients = await this.resolveRecipients(userId, tagIds);
    if (recipients.length === 0) throw new Error('no_recipients');

    const maxRecipients = bulkMessageMaxRecipientsPerCampaign();
    let skippedByCap = 0;
    if (recipients.length > maxRecipients) {
      skippedByCap = recipients.length - maxRecipients;
      recipients = recipients.slice(0, maxRecipients);
    }

    const limits = await this.getLimits(userId);
    const remainingDaily = limits.maxSentPerDay - limits.messagesSentToday;
    if (remainingDaily <= 0) throw new Error('daily_send_limit');
    if (recipients.length > remainingDaily) {
      skippedByCap += recipients.length - remainingDaily;
      recipients = recipients.slice(0, remainingDaily);
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const row = await tx.bulkMessageCampaign.create({
        data: {
          user_id: userId,
          name: input.name?.trim() || null,
          message,
          tag_ids: tagIds,
          scheduled_at: scheduledAt,
          status: 'scheduled',
          instance_name: statusInfo.instanceName,
          total_recipients: recipients.length,
          skipped_count: skippedByCap,
          next_send_at: scheduledAt,
        },
      });

      await tx.bulkMessageDelivery.createMany({
        data: recipients.map((c) => ({
          campaign_id: row.id,
          contact_id: c.id,
          phone_number: c.phone_number,
          whatsapp_id: c.whatsapp_id || `${c.phone_number}@s.whatsapp.net`,
        })),
      });

      return row;
    });

    return campaign;
  }

  static async cancel(userId: string, campaignId: string) {
    const campaign = await prisma.bulkMessageCampaign.findFirst({
      where: { id: campaignId, user_id: userId },
    });
    if (!campaign) throw new Error('not_found');
    if (['completed', 'cancelled'].includes(campaign.status)) {
      throw new Error('cannot_cancel');
    }

    await prisma.$transaction([
      prisma.bulkMessageCampaign.update({
        where: { id: campaignId },
        data: { status: 'cancelled', paused_reason: 'Cancelado pelo utilizador', next_send_at: null },
      }),
      prisma.bulkMessageDelivery.updateMany({
        where: { campaign_id: campaignId, status: 'pending' },
        data: { status: 'skipped', last_error: 'Campanha cancelada' },
      }),
    ]);

    return prisma.bulkMessageCampaign.findUniqueOrThrow({ where: { id: campaignId } });
  }

  static async pause(userId: string, campaignId: string) {
    const campaign = await prisma.bulkMessageCampaign.findFirst({
      where: { id: campaignId, user_id: userId },
    });
    if (!campaign) throw new Error('not_found');
    if (!['scheduled', 'running'].includes(campaign.status)) throw new Error('cannot_pause');

    return prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused', paused_reason: 'Pausado pelo utilizador', next_send_at: null },
    });
  }

  static async resume(userId: string, campaignId: string) {
    const campaign = await prisma.bulkMessageCampaign.findFirst({
      where: { id: campaignId, user_id: userId },
    });
    if (!campaign) throw new Error('not_found');
    if (campaign.status !== 'paused') throw new Error('cannot_resume');

    const overview = await ConnectionService.getOverview(userId);
    if (overview.whatsapp_channel === 'official') throw new Error('bulk_requires_evolution_channel');
    if (!overview.evolution.connected) throw new Error('whatsapp_disconnected');

    return prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: { status: 'running', paused_reason: null, next_send_at: new Date() },
    });
  }

  /** Número para Evolution API. */
  static recipientNumber(whatsappId: string, phoneNumber: string): string {
    const raw = whatsappId?.trim() || `${phoneNumber}@s.whatsapp.net`;
    return UserContactService.normalizePhone(raw.includes('@') ? raw.split('@')[0] : raw);
  }

  static formatCampaign(row: BulkMessageCampaign) {
    return {
      ...row,
      tag_ids: parseTagIds(row.tag_ids),
    };
  }

  static startDispatchWorker(): void {
    BulkMessageDispatch.start();
  }

  static stopDispatchWorker(): void {
    BulkMessageDispatch.stop();
  }
}

class BulkMessageDispatch {
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
      const result = await ConnectionService.sendEvolutionMessage(instanceName, {
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
