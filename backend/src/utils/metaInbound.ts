export function parseWhatsappChannel(value: string | null | undefined): 'evolution' | 'official' {
  return value === 'official' ? 'official' : 'evolution';
}

export function metaToRemoteJid(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

export function extractMetaInboundText(
  metaMessage: Record<string, unknown> | undefined,
  normalizedMessage?: Record<string, unknown> | null,
): string {
  if (normalizedMessage) {
    const conv = normalizedMessage.conversation as string | undefined;
    if (conv?.trim()) return conv.trim();
  }
  if (!metaMessage) return '';

  const type = String(metaMessage.type ?? '');
  if (type === 'text') {
    const body = (metaMessage.text as Record<string, unknown> | undefined)?.body;
    return typeof body === 'string' ? body.trim() : '';
  }

  const interactive = metaMessage.interactive as Record<string, unknown> | undefined;
  if (interactive) {
    const btn = interactive.button_reply as Record<string, unknown> | undefined;
    if (btn?.id) return String(btn.id).trim();
    if (btn?.title) return String(btn.title).trim();
    const list = interactive.list_reply as Record<string, unknown> | undefined;
    if (list?.id) return String(list.id).trim();
    if (list?.title) return String(list.title).trim();
  }

  if (type === 'button') {
    const button = metaMessage.button as Record<string, unknown> | undefined;
    if (button?.payload) return String(button.payload).trim();
    if (button?.text) return String(button.text).trim();
  }

  const image = metaMessage.image as Record<string, unknown> | undefined;
  if (image?.caption && String(image.caption).trim()) return String(image.caption).trim();
  const video = metaMessage.video as Record<string, unknown> | undefined;
  if (video?.caption && String(video.caption).trim()) return String(video.caption).trim();

  return '';
}

export function normalizeMetaMessageForJob(metaMessage: Record<string, unknown>): Record<string, unknown> {
  const text = extractMetaInboundText(metaMessage);
  if (text) return { conversation: text };
  return {};
}

export function classifyMetaInboundKind(metaMessage: Record<string, unknown>): string {
  const type = String(metaMessage.type ?? 'unknown');
  if (type === 'text') return 'meta.text';
  if (type === 'audio') return 'meta.audio';
  if (type === 'interactive' || type === 'button') return 'meta.interactive';
  if (type === 'image' || type === 'video') return 'meta.media';
  return `meta.${type}`;
}

export function metaVerifyToken(): string {
  return (process.env.META_WEBHOOK_VERIFY_TOKEN || '').trim();
}
