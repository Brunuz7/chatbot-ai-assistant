import { prisma } from './prisma.js';

const HISTORY_MAX_MESSAGES = 20;
const HISTORY_MAX_TOTAL_CHARS = 6000;
const HISTORY_MAX_ENTRY_CHARS = 1200;

function clampEntryText(raw: string): string {
  const t = String(raw ?? '').trim();
  if (t.length <= HISTORY_MAX_ENTRY_CHARS) return t;
  return `${t.slice(0, HISTORY_MAX_ENTRY_CHARS)}…`;
}

/**
 * Formata o histórico recente da conversa para prompts de IA.
 * Exclui a mensagem actual do cliente quando coincide com `excludeIncomingText`.
 */
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
  ) {
    entries.pop();
  }

  type Hist = { role: 'user' | 'assistant'; content: string };
  const mapped: Hist[] = entries.map((e) => ({
    role: e.role,
    content: clampEntryText(e.content),
  }));

  let slice = mapped.slice(-HISTORY_MAX_MESSAGES);
  const totalChars = (arr: Hist[]) => arr.reduce((n, m) => n + m.content.length, 0);
  while (slice.length > 0 && totalChars(slice) > HISTORY_MAX_TOTAL_CHARS) {
    slice = slice.slice(1);
  }

  if (slice.length === 0) {
    return '(Sem mensagens anteriores registradas nesta conversa.)';
  }

  return slice.map((m) => (m.role === 'user' ? `Cliente: ${m.content}` : `Assistente: ${m.content}`)).join('\n');
}
