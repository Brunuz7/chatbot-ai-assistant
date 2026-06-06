/** Payload `changes.value` do webhook Meta — campo account_update (Embedded Signup). */
export type MetaAccountUpdateValue = {
  event?: string;
  waba_id?: string;
  owner_business_id?: string;
  access_token?: string;
  token?: string;
  phone_number_id?: string;
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
  };
};

export type MetaAccountUpdateResult =
  | { status: 'connected'; wabaId: string; phoneNumberId: string; userId: string }
  | { status: 'ignored'; reason: string; event?: string }
  | { status: 'connection_not_found'; wabaId: string }
  | { status: 'error'; reason: string; wabaId?: string };
