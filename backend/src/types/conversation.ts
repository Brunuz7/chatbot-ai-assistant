export type ConversationMessageEntry = {
  direction: 'in' | 'out';
  content: string;
  timestamp: string;
};

export type ConversationMessageDto = {
  direction: 'in' | 'out';
  content: string;
  timestamp: string;
};

export type ConversationListItem = {
  id: string;
  contactId: string;
  phoneNumber: string;
  whatsappId: string;
  contactName: string | null;
  messageCount: number;
  lastMessage: ConversationMessageDto | null;
  agentId: string | null;
  agentName: string | null;
  activeFlowId: string | null;
  activeFlowName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetail = ConversationListItem & {
  messages: ConversationMessageDto[];
  context: unknown;
};

export type ConversationListParams = {
  page?: number | string;
  limit?: number | string;
  search?: string;
};

export type PaginatedConversations = {
  items: ConversationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type MessagesUpdateResult = {
  messages: unknown[];
  message_count: number;
  last_message_at: Date;
  last_message_direction: string;
  last_message_preview: string;
};
