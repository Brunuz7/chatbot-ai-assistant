import api from './api';
import type { TagItem, TagOption, TagPayload, TaggingSettings } from '../types/tag';

export class TagService {
  async list(): Promise<TagOption[]> {
    const { data } = await api.get<TagOption[]>('/tags');
    return data ?? [];
  }

  async listItems(): Promise<TagItem[]> {
    const { data } = await api.get<TagItem[]>('/tags');
    return data ?? [];
  }

  async create(payload: TagPayload): Promise<TagItem> {
    const { data } = await api.post<TagItem>('/tags', payload);
    return data;
  }

  async update(id: string, payload: TagPayload): Promise<TagItem> {
    const { data } = await api.put<TagItem>(`/tags/${id}`, payload);
    return data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/tags/${id}`);
  }

  async getTaggingSettings(): Promise<TaggingSettings> {
    const { data } = await api.get<TaggingSettings>('/settings');
    return data;
  }

  async updateTaggingSettings(taggingEnabled: boolean): Promise<TaggingSettings> {
    const { data } = await api.patch<TaggingSettings>('/settings/tagging', {
      tagging_enabled: taggingEnabled,
    });
    return data;
  }
}

export const tagService = new TagService();
