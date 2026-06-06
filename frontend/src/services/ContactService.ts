import api from './api';
import type {
  Contact,
  ContactPayload,
  ContactsListParams,
  ContactsListResponse,
  ConversationDetail,
} from '../types/contact';

export class ContactService {
  async listActive(params: ContactsListParams): Promise<ContactsListResponse> {
    const { data } = await api.get<ContactsListResponse>('/contacts', { params });
    return data;
  }

  async listBlocked(params: ContactsListParams): Promise<ContactsListResponse> {
    const { data } = await api.get<ContactsListResponse>('/contacts/blocked', { params });
    return data;
  }

  async create(payload: Omit<ContactPayload, 'tag_id'>): Promise<Contact> {
    const { data } = await api.post<Contact>('/contacts', payload);
    return data;
  }

  async update(id: string, payload: ContactPayload): Promise<Contact> {
    const { data } = await api.put<Contact>(`/contacts/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  }

  async block(id: string, payload: { reason: string; blockedUntil: string | null }): Promise<void> {
    await api.patch(`/contacts/${id}/block`, payload);
  }

  async unblock(id: string): Promise<void> {
    await api.patch(`/contacts/${id}/unblock`, {});
  }

  async getConversation(id: string): Promise<ConversationDetail> {
    const { data } = await api.get<ConversationDetail>(`/conversations/${id}`);
    return data;
  }
}

export const contactService = new ContactService();
