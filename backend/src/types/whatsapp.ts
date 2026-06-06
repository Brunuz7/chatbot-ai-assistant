export type OfficialConnectionStatus = {
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
