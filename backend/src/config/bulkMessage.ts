function readEnvInt(key: string, min: number, fallback: number): number {
  const n = Number(process.env[key]);
  if (Number.isFinite(n) && n >= min) return Math.floor(n);
  return fallback;
}

export const bulkMessageConfig = {
  intervalMs: readEnvInt('BULK_MESSAGE_INTERVAL_MS', 15_000, 30_000),
  jitterMs: readEnvInt('BULK_MESSAGE_JITTER_MS', 0, 5_000),
  maxRecipientsPerCampaign: readEnvInt('BULK_MESSAGE_MAX_RECIPIENTS', 1, 100),
  maxCampaignsPerDay: readEnvInt('BULK_MESSAGE_MAX_CAMPAIGNS_PER_DAY', 1, 3),
  maxSentPerDay: readEnvInt('BULK_MESSAGE_MAX_SENT_PER_DAY', 1, 200),
  minScheduleAheadMinutes: readEnvInt('BULK_MESSAGE_MIN_SCHEDULE_AHEAD_MINUTES', 0, 5),
  maxTextLength: readEnvInt('BULK_MESSAGE_MAX_TEXT_LENGTH', 100, 4096),
  pollMs: readEnvInt('BULK_MESSAGE_POLL_MS', 5_000, 10_000),
  rateLimitPauseMs: readEnvInt('BULK_MESSAGE_RATE_LIMIT_PAUSE_MS', 60_000, 60 * 60 * 1000),
  maxAttempts: readEnvInt('BULK_MESSAGE_MAX_ATTEMPTS', 1, 2),
} as const;

export function bulkMessageNextSendDelayMs(): number {
  const { intervalMs, jitterMs } = bulkMessageConfig;
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
  return intervalMs + jitter;
}
