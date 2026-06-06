import type { ConversationDetail } from '../types/contact';

export function displayConversationTitle(detail: ConversationDetail): string {
  if (detail.contactName) return detail.contactName;
  return detail.phoneNumber;
}
