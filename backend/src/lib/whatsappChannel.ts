export const WHATSAPP_CHANNELS = ['evolution', 'official'] as const;
export type WhatsappChannel = (typeof WHATSAPP_CHANNELS)[number];

export function parseWhatsappChannel(value: string | null | undefined): WhatsappChannel {
  return value === 'official' ? 'official' : 'evolution';
}
