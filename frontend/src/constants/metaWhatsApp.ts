/** Meta App ID — Cadastro incorporado WhatsApp Cloud API. */
export const META_APP_ID = import.meta.env.VITE_META_APP_ID || '26961034173555672';

/** Configuration ID do fluxo Embedded Signup (Login do Facebook para Empresas). */
export const META_EMBEDDED_CONFIG_ID =
  import.meta.env.VITE_META_EMBEDDED_CONFIG_ID || '933599703049021';

/** URL de redirecionamento após concluir o cadastro (deve estar no painel Meta). */
export const META_EMBEDDED_REDIRECT_URI = (
  import.meta.env.VITE_META_EMBEDDED_REDIRECT_URI ||
  import.meta.env.VITE_APP_URL ||
  'https://prestei.com/'
).replace(/\/?$/, '/');

const META_ONBOARD_BASE = 'https://business.facebook.com/messaging/whatsapp/onboard/';

/** URL do cadastro incorporado — mesmo formato do link gerado no painel Meta. */
export function buildMetaWhatsAppOnboardUrl(): string {
  const extras = JSON.stringify({
    version: 'v4',
    sessionInfoVersion: '3',
  });

  const params = new URLSearchParams({
    app_id: META_APP_ID,
    config_id: META_EMBEDDED_CONFIG_ID,
    extras,
    redirect_uri: META_EMBEDDED_REDIRECT_URI,
  });

  return `${META_ONBOARD_BASE}?${params.toString()}`;
}

export const META_ONBOARD_WINDOW_NAME = 'meta_whatsapp_onboard';
