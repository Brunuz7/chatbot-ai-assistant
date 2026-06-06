export interface BulkLimits {
  maxRecipientsPerCampaign: number;
  maxCampaignsPerDay: number;
  maxSentPerDay: number;
  minScheduleAheadMinutes: number;
  intervalSeconds: number;
  campaignsCreatedToday: number;
  messagesSentToday: number;
}

export interface BulkCampaign {
  id: string;
  name: string | null;
  message: string;
  tag_ids: string[];
  scheduled_at: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  paused_reason: string | null;
  created_at: string;
}

export type CreateBulkCampaignPayload = {
  name: string | null;
  message: string;
  tag_ids: string[];
  scheduled_at: string;
};

export type BulkCampaignAction = 'pause' | 'resume' | 'cancel';
