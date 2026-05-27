export function metaGraphVersion(): string {
  const raw = (process.env.META_GRAPH_VERSION || 'v25.0').trim();
  return raw.startsWith('v') ? raw : `v${raw}`;
}

export function metaGraphBase(): string {
  return `https://graph.facebook.com/${metaGraphVersion()}`;
}

export function metaAppId(): string | null {
  const id = process.env.META_APP_ID?.trim();
  return id || null;
}

export function metaAppSecret(): string | null {
  const secret = process.env.META_APP_SECRET?.trim();
  return secret || null;
}

export function metaEmbeddedSignupConfigId(): string | null {
  const id = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim();
  return id || null;
}

export function metaEmbeddedSignupAvailable(): boolean {
  return Boolean(metaAppId() && metaAppSecret() && metaEmbeddedSignupConfigId());
}

export function metaRegisterPin(): string | null {
  const pin = process.env.META_WHATSAPP_REGISTER_PIN?.trim();
  return pin && /^\d{6}$/.test(pin) ? pin : null;
}
