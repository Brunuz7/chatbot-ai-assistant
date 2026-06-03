const ALLOWED_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
]);

const MAX_BYTES = 10 * 1024 * 1024;
const MIN_BYTES = 8 * 1024;

export function extensionFromMime(mime: string, filename?: string): string {
  const m = mime.toLowerCase().split(';')[0]?.trim();
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
  };
  if (m && map[m]) return map[m];
  const fromName = filename?.split('.').pop()?.toLowerCase();
  if (fromName && ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac'].includes(fromName)) {
    return fromName;
  }
  return 'mp3';
}

export function parseVoiceCloneUpload(body: {
  audio_base64?: string;
  filename?: string;
  mime_type?: string;
}): { buffer: Buffer; filename: string; mime: string } {
  const raw = String(body.audio_base64 ?? '').trim();
  if (!raw) throw new Error('audio_base64 é obrigatório');

  const base64 = raw.includes(',') ? raw.split(',').pop()! : raw;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('audio_base64 inválido');
  }

  if (buffer.length < MIN_BYTES) {
    throw new Error('Áudio demasiado curto. Grave pelo menos alguns segundos (mín. ~8 KB).');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Áudio demasiado grande (máx. 10 MB).');
  }

  const mime = String(body.mime_type ?? 'audio/mpeg').toLowerCase().split(';')[0]?.trim();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('Formato de áudio não suportado. Use MP3, WAV, OGG ou WebM.');
  }

  const ext = extensionFromMime(mime, body.filename);
  const filename =
    String(body.filename ?? '').trim() || `voice-sample.${ext}`;

  return { buffer, filename, mime };
}
