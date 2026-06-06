function readEnvInt(key: string, min: number, fallback: number, max?: number): number {
  const n = Number(process.env[key] ?? fallback);
  if (!Number.isFinite(n) || n < min) return fallback;
  const v = Math.floor(n);
  return max != null ? Math.min(v, max) : v;
}

export const conversationConfig = {
  retentionDays: readEnvInt('CONVERSATION_RETENTION_DAYS', 1, 30),
  messagesMax: readEnvInt('CONVERSATION_MESSAGES_MAX', 10, 150, 500),
  messageContentMaxChars: readEnvInt('CONVERSATION_MESSAGE_MAX_CHARS', 200, 4000, 16000),
  lastMessagePreviewMaxChars: 280,
  historyMaxMessages: 20,
  historyMaxTotalChars: 6000,
  historyMaxEntryChars: 1200,
  retentionPollMs: 6 * 60 * 60 * 1000,
} as const;
