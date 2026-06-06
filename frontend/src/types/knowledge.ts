export interface KbItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export type KbPayload = {
  title: string;
  content: string;
  category: string | null;
};
