import axios from 'axios';
import { OpenRouterService } from '../services/OpenRouterService.js';
import { audioUntranscribedHistory, emptyCurrentMessage } from '../constants/prompts.js';

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

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
    if (normalized && AUDIO_FORMAT_BY_MIMETYPE[normalized]) return AUDIO_FORMAT_BY_MIMETYPE[normalized];
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['ogg', 'opus', 'mp3', 'm4a', 'wav', 'webm', 'aac', 'flac'].includes(ext))
      return ext === 'opus' ? 'ogg' : ext;
  }
  return 'ogg';
}

export function extractEvolutionInboundText(message: Record<string, unknown> | undefined | null): string {
  if (!message) return '';
  const m = message as Record<string, unknown>;

  const buttonsResp = m.buttonsResponseMessage as Record<string, unknown> | undefined;
  const templateBtn = m.templateButtonReplyMessage as Record<string, unknown> | undefined;
  const listResp = m.listResponseMessage as Record<string, unknown> | undefined;
  const listSel = listResp?.singleSelectReply as Record<string, unknown> | undefined;

  const btnId = buttonsResp?.selectedButtonId ?? templateBtn?.selectedId ?? listSel?.selectedRowId;
  const btnText = buttonsResp?.selectedDisplayText;

  if (btnId != null && String(btnId).trim()) return String(btnId).trim();
  if (btnText != null && String(btnText).trim()) return String(btnText).trim();

  const conv = m.conversation as string | undefined;
  if (conv && conv.trim()) return conv.trim();

  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext?.text && String(ext.text).trim()) return String(ext.text).trim();

  const speech = (m as Record<string, unknown>).speechToText as string | undefined;
  if (speech && speech.trim()) return normalizeTranscribedSpeech(speech);

  const image = m.imageMessage as Record<string, unknown> | undefined;
  if (image?.caption && String(image.caption).trim()) return String(image.caption).trim();

  const video = m.videoMessage as Record<string, unknown> | undefined;
  if (video?.caption && String(video.caption).trim()) return String(video.caption).trim();

  return '';
}

export function classifyEvolutionInboundKind(message: Record<string, unknown> | undefined): string {
  if (!message) return 'upsert.no_message';
  const m = message;
  if (m.buttonsResponseMessage || m.templateButtonReplyMessage || m.listResponseMessage) return 'upsert.interactive';
  if (m.conversation && String(m.conversation as string).trim()) return 'upsert.conversation';
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext?.text && String(ext.text).trim()) return 'upsert.extended_text';
  if (m.imageMessage || m.videoMessage) return 'upsert.media';
  if (messageHasAudio(m)) return 'upsert.audio';
  const speech = m.speechToText as string | undefined;
  if (speech?.trim()) return 'upsert.speech';
  return 'upsert.other';
}

export function readAudioBase64FromPayload(
  innerMessage: Record<string, unknown> | undefined | null,
  webhookMessage: Record<string, unknown> | undefined | null,
): { base64: string; mimetype?: string; fileName?: string } | null {
  const candidates: unknown[] = [
    innerMessage?.base64,
    (innerMessage?.audioMessage as Record<string, unknown> | undefined)?.base64,
    webhookMessage?.base64,
    (webhookMessage?.message as Record<string, unknown> | undefined)?.base64,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      const audioMsg =
        (innerMessage?.audioMessage as Record<string, unknown> | undefined) ||
        ((webhookMessage?.message as Record<string, unknown> | undefined)?.audioMessage as
          | Record<string, unknown>
          | undefined);
      const mimetype = (audioMsg?.mimetype as string | undefined) || (webhookMessage?.mimetype as string | undefined);
      const fileName = audioMsg?.fileName as string | undefined;
      return { base64: value.trim(), mimetype, fileName };
    }
  }

  return null;
}

export async function fetchAudioBase64FromEvolution(
  instanceName: string,
  webhookMessage: Record<string, unknown>,
): Promise<{ base64: string; mimetype?: string; fileName?: string } | null> {
  if (!EVO_URL || !EVO_KEY) return null;

  try {
    const res = await axios.post(
      `${EVO_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      { message: webhookMessage, convertToMp4: false },
      { headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' }, timeout: 90_000 },
    );

    const base64 = res.data?.base64;
    if (typeof base64 !== 'string' || !base64.trim()) return null;

    return {
      base64: base64.trim(),
      mimetype: res.data?.mimetype as string | undefined,
      fileName: res.data?.fileName as string | undefined,
    };
  } catch (err: unknown) {
    console.warn('getBase64FromMediaMessage falhou:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function transcribeEvolutionInboundAudio(
  instanceName: string,
  innerMessage: Record<string, unknown> | undefined | null,
  webhookMessage: Record<string, unknown> | undefined | null,
): Promise<string | null> {
  const media =
    readAudioBase64FromPayload(innerMessage, webhookMessage) ||
    (webhookMessage ? await fetchAudioBase64FromEvolution(instanceName, webhookMessage) : null);

  if (!media?.base64) return null;

  const format = openRouterAudioFormat(media.mimetype, media.fileName);
  return OpenRouterService.transcribeAudio({ base64: media.base64, format });
}

export async function resolveEvolutionInboundText(
  instanceName: string,
  innerMessage: Record<string, unknown> | undefined | null,
  webhookMessage: Record<string, unknown> | undefined | null,
): Promise<string> {
  const direct = normalizeTranscribedSpeech(extractEvolutionInboundText(innerMessage));
  if (direct) return direct;

  if (!messageHasAudio(innerMessage)) return '';

  try {
    const transcript = await transcribeEvolutionInboundAudio(instanceName, innerMessage, webhookMessage);
    return normalizeTranscribedSpeech(transcript || '');
  } catch (err: unknown) {
    console.warn('STT OpenRouter indisponível para mensagem de áudio:', err instanceof Error ? err.message : err);
    return '';
  }
}

export function formatInboundContentForHistory(text: string, wasAudio: boolean): string {
  const trimmed = text.trim();
  if (!trimmed) return wasAudio ? audioUntranscribedHistory : emptyCurrentMessage;
  if (wasAudio) return `[áudio] ${trimmed}`;
  return trimmed;
}

export function conversationPhone(remoteJid: string): string {
  return remoteJid.split('@')[0] || remoteJid;
}
