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
