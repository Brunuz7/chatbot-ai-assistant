/** Política anti-spam para envios em massa (WhatsApp). */

export function bulkMessageIntervalMs(): number {
  const n = Number(process.env.BULK_MESSAGE_INTERVAL_MS);
  if (Number.isFinite(n) && n >= 15_000) return Math.floor(n);
  return 30_000;
}

export function bulkMessageJitterMs(): number {
  const n = Number(process.env.BULK_MESSAGE_JITTER_MS);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return 5_000;
}

export function bulkMessageMaxRecipientsPerCampaign(): number {
  const n = Number(process.env.BULK_MESSAGE_MAX_RECIPIENTS);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 100;
}

export function bulkMessageMaxCampaignsPerDay(): number {
  const n = Number(process.env.BULK_MESSAGE_MAX_CAMPAIGNS_PER_DAY);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 3;
}

export function bulkMessageMaxSentPerDay(): number {
  const n = Number(process.env.BULK_MESSAGE_MAX_SENT_PER_DAY);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 200;
}

export function bulkMessageMinScheduleAheadMinutes(): number {
  const n = Number(process.env.BULK_MESSAGE_MIN_SCHEDULE_AHEAD_MINUTES);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return 5;
}

export function bulkMessageMaxTextLength(): number {
  const n = Number(process.env.BULK_MESSAGE_MAX_TEXT_LENGTH);
  if (Number.isFinite(n) && n >= 100) return Math.floor(n);
  return 4096;
}

export function bulkMessagePollMs(): number {
  const n = Number(process.env.BULK_MESSAGE_POLL_MS);
  if (Number.isFinite(n) && n >= 5_000) return Math.floor(n);
  return 10_000;
}

export function bulkMessageRateLimitPauseMs(): number {
  const n = Number(process.env.BULK_MESSAGE_RATE_LIMIT_PAUSE_MS);
  if (Number.isFinite(n) && n >= 60_000) return Math.floor(n);
  return 60 * 60 * 1000;
}

export function bulkMessageMaxAttempts(): number {
  const n = Number(process.env.BULK_MESSAGE_MAX_ATTEMPTS);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 2;
}

export function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function nextSendDelayMs(): number {
  const jitter = bulkMessageJitterMs() > 0 ? Math.floor(Math.random() * bulkMessageJitterMs()) : 0;
  return bulkMessageIntervalMs() + jitter;
}

export function isLikelyRateLimitError(message: string, httpStatus?: number): boolean {
  if (httpStatus === 429 || httpStatus === 503) return true;
  const m = message.toLowerCase();
  return (
    m.includes('rate') ||
    m.includes('limit') ||
    m.includes('too many') ||
    m.includes('blocked') ||
    m.includes('ban') ||
    m.includes('spam')
  );
}
