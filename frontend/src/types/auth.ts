export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  company_name?: string | null;
  company_segment?: string | null;
  phone_number?: string | null;
  plan_id?: string;
  plan?: import('./plan').UserPlanSummary;
}

export interface AuthTokens {
  accessToken: string;
}

export interface RegisterPayload {
  name: string;
  company_name?: string;
  company_segment: string;
  phone_number?: string;
  email: string;
  password: string;
}

export type UpdateProfilePayload = {
  name: string;
  email: string;
  company_name?: string;
  company_segment: string;
  phone_number?: string;
  password?: string;
};
