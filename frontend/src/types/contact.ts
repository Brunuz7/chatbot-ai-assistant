import type { TagOption } from './tag';

export interface TagRef {
  id: string;
  name: string;
  color: string | null;
}

export interface ContactConversation {
  id: string;
  messageCount: number;
  lastMessage: ConversationMessage | null;
  updatedAt: string;
  agentName: string | null;
  activeFlowName: string | null;
}

export interface Contact {
  id: string;
  phone_number: string;
  whatsapp_id?: string;
  blocked: boolean;
  created_at: string;
  block_reason?: string;
  blocked_at?: string;
  blocked_until?: string;
  name?: string;
  observation?: string;
  tag_id?: string | null;
  tag?: TagRef | null;
  conversation?: ContactConversation | null;
}

export interface ContactsListResponse {
  items: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    active: number;
    blocked: number;
  };
}

export type MessageDirection = 'in' | 'out';

export interface ConversationMessage {
  direction: MessageDirection;
  content: string;
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  messageCount: number;
  lastMessage: ConversationMessage | null;
  agentName: string | null;
  activeFlowName: string | null;
  messages: ConversationMessage[];
  context: unknown;
}

export type ContactPayload = {
  name: string | null;
  phone_number: string;
  observation: string | null;
  tag_id?: string | null;
};

export type ContactsListParams = {
  page: number;
  limit: number;
  search?: string;
  tag_id?: string;
};
