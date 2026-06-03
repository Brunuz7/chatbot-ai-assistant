export type EmbeddedSignupPublicConfig = {
  available: boolean;
  app_id: string | null;
  config_id: string | null;
  graph_version: string;
  register_pin_configured: boolean;
};

export type EmbeddedSignupSessionData = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
};

export type EmbeddedSignupMessageEvent = {
  type: 'WA_EMBEDDED_SIGNUP';
  event?: string;
  data?: EmbeddedSignupSessionData;
};
