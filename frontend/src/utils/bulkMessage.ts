type BulkCampaignBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const BULK_STATUS_VARIANT: Record<string, BulkCampaignBadgeVariant> = {
  completed: 'success',
  running: 'info',
  scheduled: 'info',
  paused: 'warning',
  cancelled: 'danger',
  failed: 'danger',
};

export function bulkCampaignStatusVariant(status: string): BulkCampaignBadgeVariant {
  return BULK_STATUS_VARIANT[status] ?? 'default';
}
