export const TTS_REPLY_MODES = ['never', 'when_contact_sent_audio', 'always'] as const;
export type TtsReplyMode = (typeof TTS_REPLY_MODES)[number];

export function parseTtsReplyMode(value: unknown): TtsReplyMode {
  if (value === 'when_contact_sent_audio' || value === 'always' || value === 'never') {
    return value;
  }
  return 'never';
}

export function shouldReplyWithAudio(params: {
  enabled: boolean;
  mode: TtsReplyMode;
  contactSentAudio: boolean;
  /** Ação de fluxo que exige resposta em voz. */
  force?: boolean;
}): boolean {
  if (params.force) return true;
  if (!params.enabled || params.mode === 'never') return false;
  if (params.mode === 'always') return true;
  return params.contactSentAudio;
}
