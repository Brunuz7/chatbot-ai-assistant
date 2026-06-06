export type DashboardStatsPeriod = 'day' | 'week' | 'month';

export type DashboardConversationDay = {
  date: string;
  label: string;
  count: number;
};

export type DashboardOverview = {
  period: DashboardStatsPeriod;
  from: string;
  to: string;
  conversationsCount: number;
  conversationsChangePercent: number;
  aiResolutionPercent: number;
  aiResolutionChangePercent: number;
  newContactsCount: number;
  newContactsChangePercent: number;
  messagesCount: number;
  messagesChangePercent: number;
  pendingCount: number;
  pendingChangePercent: number;
  whatsapp: {
    connected: boolean;
    statusLabel: string;
  };
  conversationsByDay: DashboardConversationDay[];
  summary: {
    totalConversations: number;
    uniqueContacts: number;
    aiResolutionPercent: number;
    newContacts: number;
    pendingConversations: number;
    whatsappConnected: boolean;
  };
};

/** @deprecated */
export type DashboardStats = DashboardOverview;
