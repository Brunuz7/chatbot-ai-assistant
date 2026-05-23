import type { TtsReplyMode } from '../lib/ttsReplyPolicy.js';

export type TtsVoiceType = 'preset' | 'clone';

export type TtsReplySettings = {
  tts_reply_enabled: boolean;
  tts_reply_mode: TtsReplyMode;
  tts_voice_type: TtsVoiceType;
  tts_voice: string;
  tts_model: string;
  tts_max_chars: number;
  mistral_voice_id: string | null;
  has_cloned_voice: boolean;
};

export type UpdateTtsReplyBody = {
  tts_reply_enabled?: boolean;
  tts_reply_mode?: TtsReplyMode;
  tts_voice_type?: TtsVoiceType;
  tts_voice?: string;
  tts_model?: string;
  tts_max_chars?: number;
};
