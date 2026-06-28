/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_PRIVACY_CONTACT_EMAIL?: string;
  readonly VITE_META_APP_ID?: string;
  readonly VITE_META_EMBEDDED_CONFIG_ID?: string;
  readonly VITE_META_EMBEDDED_REDIRECT_URI?: string;
  /** 0 = oculta ligação QR/Evolution (submissão Meta). Deve coincidir com WHATSAPP_EVOLUTION_CHANNEL_ENABLED no backend. */
  readonly VITE_WHATSAPP_EVOLUTION_CHANNEL_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
