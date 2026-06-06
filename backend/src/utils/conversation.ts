import { prisma } from '../prisma.js';
import { conversationConfig } from '../config/conversation.js';
import type { ConversationMessageDto, ConversationMessageEntry, MessagesUpdateResult } from '../types/conversation.js';
import { emptyHistory, formatHistoryBlock } from '../constants/prompts.js';

type StoredMessage = {
  direction?: string;
  content?: string;
  timestamp?: string;
};

function clampMessageContent(content: string): string {
  const t = String(content ?? '').trim() || '(sem texto)';
  const max = conversationConfig.messageContentMaxChars;
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function clampMessageEntry(entry: ConversationMessageEntry): ConversationMessageEntry {
  const ts = typeof entry.timestamp === 'string' && entry.timestamp.trim() ? entry.timestamp : new Date().toISOString();
  const direction = entry.direction === 'out' ? 'out' : 'in';
  return { direction, content: clampMessageContent(entry.content), timestamp: ts };
}

function previewText(content: string): string {
  const t = clampMessageContent(content);
  const max = conversationConfig.lastMessagePreviewMaxChars;
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function trimStoredMessages(msgs: unknown[]): unknown[] {
  const max = conversationConfig.messagesMax;
  if (msgs.length <= max) return msgs;
  return msgs.slice(-max);
}

function summaryFieldsFromEntry(entry: ConversationMessageEntry) {
  const at = new Date(entry.timestamp);
  return {
    last_message_at: Number.isNaN(at.getTime()) ? new Date() : at,
    last_message_direction: entry.direction,
    last_message_preview: previewText(entry.content),
  };
}

export function buildMessagesUpdate(existingMessages: unknown, rawEntry: ConversationMessageEntry): MessagesUpdateResult {
  const entry = clampMessageEntry(rawEntry);
  const prev = Array.isArray(existingMessages) ? [...existingMessages] : [];
  const messages = trimStoredMessages([...prev, entry]);
  const summary = summaryFieldsFromEntry(entry);
  return { messages, message_count: messages.length, ...summary };
}

function clampHistoryEntryText(raw: string): string {
  const t = String(raw ?? '').trim();
  const max = conversationConfig.historyMaxEntryChars;
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function formatRecentConversationHistory(
  userId: string,
  whatsappId: string,
  excludeIncomingText?: string,
): Promise<string> {
  const incoming = String(excludeIncomingText ?? '').trim();
  const row = await prisma.conversation.findUnique({
    where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
    select: { messages: true },
  });

  const list = Array.isArray(row?.messages) ? (row.messages as unknown[]) : [];
  const entries: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const role = o.direction === 'in' ? 'user' : o.direction === 'out' ? 'assistant' : null;
    if (!role) continue;
    const textRaw = String(o.content ?? '').trim();
    if (!textRaw) continue;
    entries.push({ role, content: textRaw });
  }

  while (
    entries.length > 0 &&
    entries[entries.length - 1].role === 'user' &&
    incoming &&
    entries[entries.length - 1].content === incoming
  )
    entries.pop();

  type Hist = { role: 'user' | 'assistant'; content: string };
  const mapped: Hist[] = entries.map((e) => ({ role: e.role, content: clampHistoryEntryText(e.content) }));

  let slice = mapped.slice(-conversationConfig.historyMaxMessages);
  const totalChars = (arr: Hist[]) => arr.reduce((n, m) => n + m.content.length, 0);
  while (slice.length > 0 && totalChars(slice) > conversationConfig.historyMaxTotalChars) slice = slice.slice(1);

  if (slice.length === 0) return emptyHistory;

  return formatHistoryBlock(slice);
}

export function parseMessages(raw: unknown): ConversationMessageDto[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessageDto[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as StoredMessage;
    const direction = o.direction === 'out' ? 'out' : o.direction === 'in' ? 'in' : null;
    if (!direction) continue;
    const content = String(o.content ?? '').trim() || '(sem texto)';
    let timestamp = new Date().toISOString();
    if (typeof o.timestamp === 'string' && o.timestamp.trim()) {
      const d = new Date(o.timestamp);
      if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
    }
    out.push({ direction, content, timestamp });
  }
  return out;
}

export function lastMessageFromSummary(row: {
  last_message_at: Date | null;
  last_message_direction: string | null;
  last_message_preview: string | null;
}): ConversationMessageDto | null {
  if (!row.last_message_at || !row.last_message_direction) return null;
  const direction = row.last_message_direction === 'out' ? 'out' : 'in';
  return {
    direction,
    content: row.last_message_preview?.trim() || '(sem texto)',
    timestamp: row.last_message_at.toISOString(),
  };
}
