export type WhatsAppTemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type WhatsAppTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TemplateHeaderInput =
  | { type: 'none' }
  | { type: 'text'; text: string }
  | { type: 'image' | 'video' | 'document'; sample_handle: string };

export type TemplateButtonInput =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string; example?: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string };

export type CreateWhatsAppTemplateInput = {
  name: string;
  category: WhatsAppTemplateCategory;
  body: string;
  body_examples?: string[];
  footer?: string | null;
  header?: TemplateHeaderInput;
  buttons?: TemplateButtonInput[];
  copy_code_text?: string | null;
};

export type WhatsAppTemplateRow = {
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
