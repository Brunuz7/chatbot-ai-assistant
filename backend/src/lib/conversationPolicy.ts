/** Dias que uma conversa permanece na base (após última actualização). */
export function conversationRetentionDays(): number {
  const n = Number(process.env.CONVERSATION_RETENTION_DAYS ?? 30);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.floor(n);
}

/** Máximo de mensagens guardadas no JSON por conversa. */
export function messagesPerConversationMax(): number {
  const n = Number(process.env.CONVERSATION_MESSAGES_MAX ?? 150);
  if (!Number.isFinite(n) || n < 10) return 150;
  return Math.min(Math.floor(n), 500);
}

/** Tamanho máximo do texto de cada mensagem (caracteres). */
export function messageContentMaxChars(): number {
  const n = Number(process.env.CONVERSATION_MESSAGE_MAX_CHARS ?? 4000);
  if (!Number.isFinite(n) || n < 200) return 4000;
  return Math.min(Math.floor(n), 16000);
}

/** Pré-visualização na listagem. */
export function lastMessagePreviewMaxChars(): number {
  return 280;
}
