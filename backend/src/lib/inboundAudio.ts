const AUDIO_FORMAT_BY_MIMETYPE: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

/** Remove prefixo Evolution/OpenAI `[audio]` do texto transcrito. */
export function normalizeTranscribedSpeech(text: string): string {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^\[audio\]\s*/i, '').trim();
}

export function messageHasAudio(message: Record<string, unknown> | undefined | null): boolean {
  if (!message) return false;
  if (message.audioMessage) return true;

  for (const wrapperKey of ['viewOnceMessage', 'viewOnceMessageV2'] as const) {
    const wrapper = message[wrapperKey] as Record<string, unknown> | undefined;
    const inner = wrapper?.message as Record<string, unknown> | undefined;
    if (inner?.audioMessage) return true;
  }

  return false;
}

export function openRouterAudioFormat(mimetype: string | undefined, fileName?: string): string {
  if (mimetype) {
    const normalized = mimetype.split(';')[0]?.trim().toLowerCase();
    if (normalized && AUDIO_FORMAT_BY_MIMETYPE[normalized]) {
      return AUDIO_FORMAT_BY_MIMETYPE[normalized];
    }
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['ogg', 'opus', 'mp3', 'm4a', 'wav', 'webm', 'aac', 'flac'].includes(ext)) {
      return ext === 'opus' ? 'ogg' : ext;
    }
  }

  return 'ogg';
}
