import {
  lastMessagePreviewMaxChars,
  messageContentMaxChars,
  messagesPerConversationMax,
} from './conversationPolicy.js';

export type ConversationMessageEntry = {
  direction: 'in' | 'out';
  content: string;
  timestamp: string;
};

export function clampMessageContent(content: string): string {
  const t = String(content ?? '').trim() || '(sem texto)';
  const max = messageContentMaxChars();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function clampMessageEntry(entry: ConversationMessageEntry): ConversationMessageEntry {
  const ts =
    typeof entry.timestamp === 'string' && entry.timestamp.trim()
      ? entry.timestamp
      : new Date().toISOString();
  const direction = entry.direction === 'out' ? 'out' : 'in';
  return {
    direction,
    content: clampMessageContent(entry.content),
    timestamp: ts,
  };
}

export function previewText(content: string): string {
  const t = clampMessageContent(content);
  const max = lastMessagePreviewMaxChars();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function trimStoredMessages(msgs: unknown[]): unknown[] {
  const max = messagesPerConversationMax();
  if (msgs.length <= max) return msgs;
  return msgs.slice(-max);
}

export function summaryFieldsFromEntry(entry: ConversationMessageEntry) {
  const at = new Date(entry.timestamp);
  return {
    last_message_at: Number.isNaN(at.getTime()) ? new Date() : at,
    last_message_direction: entry.direction,
    last_message_preview: previewText(entry.content),
  };
}

export function buildMessagesUpdate(
  existingMessages: unknown,
  rawEntry: ConversationMessageEntry,
): {
  messages: unknown[];
  message_count: number;
  last_message_at: Date;
  last_message_direction: string;
  last_message_preview: string;
} {
  const entry = clampMessageEntry(rawEntry);
  const prev = Array.isArray(existingMessages) ? [...existingMessages] : [];
  const messages = trimStoredMessages([...prev, entry]);
  const summary = summaryFieldsFromEntry(entry);
  return {
    messages,
    message_count: messages.length,
    ...summary,
  };
}
