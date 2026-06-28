import api from './api';
import type {
  CreateWhatsAppTemplatePayload,
  TemplateSampleUploadResult,
  WhatsAppTemplate,
} from '../types/whatsappTemplate';

export class TemplateService {
  async list(options?: { sync?: boolean }): Promise<WhatsAppTemplate[]> {
    const params = options?.sync ? { sync: '1' } : undefined;
    const { data } = await api.get<WhatsAppTemplate[]>('/whatsapp-templates', { params });
    return data ?? [];
  }

  async uploadSample(file: File): Promise<TemplateSampleUploadResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<TemplateSampleUploadResult>('/whatsapp-templates/upload-sample', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async create(payload: CreateWhatsAppTemplatePayload): Promise<WhatsAppTemplate> {
    const { data } = await api.post<WhatsAppTemplate>('/whatsapp-templates', payload);
    return data;
  }

  async sync(id: string): Promise<WhatsAppTemplate> {
    const { data } = await api.post<WhatsAppTemplate>(`/whatsapp-templates/${id}/sync`);
    return data;
  }
}

export const templateService = new TemplateService();
