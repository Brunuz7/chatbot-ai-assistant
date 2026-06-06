export interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export interface TagItem extends TagOption {
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TagPayload = {
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
};

export type TaggingSettings = {
  tagging_enabled: boolean;
};
