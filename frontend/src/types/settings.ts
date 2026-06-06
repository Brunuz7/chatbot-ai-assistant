import type { WorkingHours } from '../utils/workingHours';

export type TtsVoiceType = 'preset' | 'clone';

export interface UserSettings {
  delay_seconds: number;
  working_hours: WorkingHours;
  holidays: unknown[];
  tts_voice_type?: TtsVoiceType;
  tts_voice: string;
  tts_model: string;
  tts_max_chars: number;
  mistral_voice_id?: string | null;
  has_cloned_voice?: boolean;
}

export interface VoiceCloneStatus {
  has_cloned_voice: boolean;
  mistral_configured: boolean;
  tts_voice_type: TtsVoiceType;
}

export type TtsReplyPayload = {
  tts_voice_type: TtsVoiceType;
  tts_voice: string;
  tts_max_chars: number;
};

export type SchedulePayload = {
  delay_seconds: number;
  working_hours: WorkingHours;
};

export type VoiceCloneUploadPayload = {
  audio_base64: string;
  filename: string;
  mime_type: string;
};
