export type WhatsappChannel = 'evolution' | 'official';

export type OfficialWhatsAppStatus = {
  connected: boolean;
  status: string;
  phone_number_id: string | null;
  waba_id: string | null;
  business_account_id: string | null;
  display_phone: string | null;
  verified_name: string | null;
  last_validated_at: string | null;
  has_token: boolean;
  token_preview: string | null;
};

export type ConnectionOverview = {
  whatsapp_channel: WhatsappChannel;
  features: { evolution_channel: boolean };
  evolution?: {
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

export type EvolutionInstanceStatus = {
  connectionStatus: string;
  instanceName: string;
  chatbotEnabled: boolean;
};

export type InstanceQrCodeResponse = {
  connected?: boolean;
  base64?: string;
};
