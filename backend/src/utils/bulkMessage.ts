import { UserContactService } from '../services/UserContactService.js';

export function parseTagIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export function isGroupOrBroadcast(whatsappId: string | null | undefined, phone: string): boolean {
  const id = whatsappId || '';
  if (id.endsWith('@g.us') || id.includes('broadcast')) return true;
  return phone.length > 15;
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

export function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Número normalizado para Evolution API. */
export function bulkRecipientNumber(whatsappId: string, phoneNumber: string): string {
  const raw = whatsappId?.trim() || `${phoneNumber}@s.whatsapp.net`;
  return UserContactService.normalizePhone(raw.includes('@') ? raw.split('@')[0] : raw);
}
