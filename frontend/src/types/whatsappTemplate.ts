export type WhatsAppTemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type WhatsAppTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TemplateHeaderMode = 'none' | 'text' | 'image' | 'video' | 'document';

export type TemplateButtonMode = 'none' | 'QUICK_REPLY' | 'CALL_TO_ACTION';

export type TemplateHeaderInput =
  | { type: 'none' }
  | { type: 'text'; text: string }
  | { type: 'image' | 'video' | 'document'; sample_handle: string };

export type TemplateButtonInput =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string; example?: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string };

export type WhatsAppTemplate = {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  footer: string | null;
  components: unknown;
  meta_template_id: string | null;
  status: WhatsAppTemplateStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWhatsAppTemplatePayload = {
  name: string;
  category: WhatsAppTemplateCategory;
  body: string;
  body_examples?: string[];
  footer?: string | null;
  header?: TemplateHeaderInput;
  buttons?: TemplateButtonInput[];
  copy_code_text?: string | null;
};

export type TemplateSampleUploadResult = {
  handle: string;
  mime_type: string;
};
