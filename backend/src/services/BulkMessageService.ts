import type { BulkMessageCampaign, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { withNotDeleted } from '../lib/softDelete.js';
import {
  bulkMessageMaxCampaignsPerDay,
  bulkMessageMaxRecipientsPerCampaign,
  bulkMessageMaxSentPerDay,
  bulkMessageMaxTextLength,
  bulkMessageMinScheduleAheadMinutes,
  startOfUtcDay,
} from '../lib/bulkMessagePolicy.js';
import { EvolutionService } from './EvolutionService.js';
import { UserContactService } from './UserContactService.js';

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

    const statusInfo = await EvolutionService.getInstanceStatus(userId);
    if (statusInfo.connectionStatus !== 'CONNECTED') {
      throw new Error('whatsapp_disconnected');
    }

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

    const statusInfo = await EvolutionService.getInstanceStatus(userId);
    if (statusInfo.connectionStatus !== 'CONNECTED') throw new Error('whatsapp_disconnected');

    return prisma.bulkMessageCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        paused_reason: null,
        next_send_at: new Date(),
      },
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
}
