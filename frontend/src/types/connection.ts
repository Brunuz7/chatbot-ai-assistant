import type { OfficialWhatsAppStatus } from '../components/whatsapp/OfficialWhatsAppWizard';
import type { EmbeddedSignupPublicConfig } from './metaEmbeddedSignup';

export type WhatsappChannel = 'evolution' | 'official';

export type ConnectionOverview = {
  whatsapp_channel: WhatsappChannel;
  official_webhook_url?: string | null;
  meta_verify_token_configured?: boolean;
  embedded_signup?: EmbeddedSignupPublicConfig;
  evolution: {
    connectionStatus: string;
    instanceName: string;
    chatbotEnabled: boolean;
    connected: boolean;
  };
  official: OfficialWhatsAppStatus & { chatbotEnabled: boolean };
  active: {
    channel: WhatsappChannel;
    connected: boolean;
    chatbotEnabled: boolean;
    connectionStatus: string;
    instanceName: string;
  };
};
