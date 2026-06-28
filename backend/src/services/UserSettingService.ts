import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../prisma.js';
import { PlanService } from './PlanService.js';
import type {
  DayScheduleInput,
  TimeIntervalInput,
  TtsReplySettings,
  UpdateScheduleBody,
  UpdateTtsReplyBody,
  WorkingHoursInput,
} from '../types/index.js';
import { MistralVoiceService } from './MistralVoiceService.js';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const MAX_INTERVALS_PER_DAY = 4;

function parseTimeHHmm(value: unknown): string | null {
  const t = String(value ?? '').trim();
  return /^\d{2}:\d{2}$/.test(t) ? t : null;
}

function normalizeIntervals(raw: Record<string, unknown>): TimeIntervalInput[] {
  if (Array.isArray(raw.intervals)) {
    const parsed = raw.intervals
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          start: parseTimeHHmm(row.start) ?? '00:00',
          end: parseTimeHHmm(row.end) ?? '23:59',
        };
      })
      .slice(0, MAX_INTERVALS_PER_DAY);
    if (parsed.length > 0) return parsed;
  }

  return [
    {
      start: parseTimeHHmm(raw.start) ?? '00:00',
      end: parseTimeHHmm(raw.end) ?? '23:59',
    },
  ];
}

function normalizeWorkingHours(input: WorkingHoursInput): WorkingHoursInput {
  const timezone = String(input.timezone ?? '').trim() || 'America/Sao_Paulo';
  const daysIn = input.days && typeof input.days === 'object' ? input.days : {};
  const days: WorkingHoursInput['days'] = {};

  for (const key of WEEKDAY_KEYS) {
    const raw = daysIn[key];
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    days[key] = {
      enabled: row.enabled === true,
      intervals: normalizeIntervals(row),
    };
  }

  return { timezone, days };
}

const DEFAULT_DAY_INTERVAL = { start: '00:00', end: '23:59' } as const;

const DEFAULT_WORKING_HOURS = {
  timezone: 'America/Sao_Paulo',
  days: Object.fromEntries(
    WEEKDAY_KEYS.map((key) => [key, { enabled: true, intervals: [{ ...DEFAULT_DAY_INTERVAL }] }]),
  ),
};
const DEFAULT_HOLIDAYS: unknown[] = [];
const DEFAULT_TTS_MODEL = 'openai/gpt-4o-mini-tts-2025-12-15';
const DEFAULT_TTS_VOICE = 'nova';
const DEFAULT_TTS_MAX_CHARS = 500;

const VOICE_CLONE_ROOT = path.resolve(
  process.env.VOICE_CLONES_DIR || path.join(process.cwd(), 'storage', 'voice-clones'),
);

const VOICE_CLONE_ALLOWED_MIME = new Set([
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

function voiceCloneDir(userId: string): string {
  return path.join(VOICE_CLONE_ROOT, userId);
}

function voiceCloneSamplePath(userId: string, ext = 'mp3'): string {
  return path.join(voiceCloneDir(userId), `sample.${ext}`);
}

async function saveVoiceCloneSample(userId: string, buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).replace(/^\./, '') || 'mp3';
  const dir = voiceCloneDir(userId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = voiceCloneSamplePath(userId, ext);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function deleteVoiceCloneSample(userId: string): Promise<void> {
  try {
    await fs.rm(voiceCloneDir(userId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function extensionFromVoiceMime(mime: string, filename?: string): string {
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
  if (fromName && ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac'].includes(fromName)) return fromName;
  return 'mp3';
}

function parseVoiceCloneUpload(body: { audio_base64?: string; filename?: string; mime_type?: string }): {
  buffer: Buffer;
  filename: string;
  mime: string;
} {
  const raw = String(body.audio_base64 ?? '').trim();
  if (!raw) throw new Error('audio_base64 é obrigatório');

  const base64 = raw.includes(',') ? raw.split(',').pop()! : raw;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('audio_base64 inválido');
  }

  if (buffer.length < 8 * 1024) throw new Error('Áudio demasiado curto. Grave pelo menos alguns segundos (mín. ~8 KB).');
  if (buffer.length > 10 * 1024 * 1024) throw new Error('Áudio demasiado grande (máx. 10 MB).');

  const mime = String(body.mime_type ?? 'audio/mpeg')
    .toLowerCase()
    .split(';')[0]
    ?.trim();
  if (!mime || !VOICE_CLONE_ALLOWED_MIME.has(mime))
    throw new Error('Formato de áudio não suportado. Use MP3, WAV, OGG ou WebM.');

  const ext = extensionFromVoiceMime(mime, body.filename);
  const filename = String(body.filename ?? '').trim() || `voice-sample.${ext}`;

  return { buffer, filename, mime };
}

export class UserSettingService {
  static async getOrCreate(userId: string) {
    const existing = await prisma.userSetting.findUnique({ where: { user_id: userId } });
    if (existing) return existing;

    return prisma.userSetting.create({
      data: {
        user_id: userId,
        working_hours: DEFAULT_WORKING_HOURS,
        holidays: DEFAULT_HOLIDAYS,
        tagging_enabled: false,
        tts_voice: DEFAULT_TTS_VOICE,
        tts_model: DEFAULT_TTS_MODEL,
        tts_max_chars: DEFAULT_TTS_MAX_CHARS,
      },
    });
  }

  static toTtsReplySettings(row: {
    tts_voice_type: string;
    tts_voice: string;
    tts_model: string;
    tts_max_chars: number;
    mistral_voice_id: string | null;
  }): TtsReplySettings {
    const voiceType = row.tts_voice_type === 'clone' ? 'clone' : 'preset';
    const mistralVoiceId = row.mistral_voice_id?.trim() || null;
    return {
      tts_voice_type: voiceType === 'clone' && mistralVoiceId ? 'clone' : 'preset',
      tts_voice: row.tts_voice?.trim() || DEFAULT_TTS_VOICE,
      tts_model: row.tts_model?.trim() || DEFAULT_TTS_MODEL,
      tts_max_chars: Math.min(2000, Math.max(80, row.tts_max_chars || DEFAULT_TTS_MAX_CHARS)),
      mistral_voice_id: mistralVoiceId,
      has_cloned_voice: !!mistralVoiceId,
    };
  }

  static async getTtsReplySettings(userId: string): Promise<TtsReplySettings> {
    const row = await this.getOrCreate(userId);
    return this.toTtsReplySettings(row);
  }

  static async updateTtsReply(userId: string, body: UpdateTtsReplyBody) {
    const row = await this.getOrCreate(userId);

    const data: Record<string, unknown> = {};

    if (body.tts_voice_type !== undefined) {
      if (body.tts_voice_type !== 'preset' && body.tts_voice_type !== 'clone')
        throw new Error('tts_voice_type inválido');

      data.tts_voice_type = body.tts_voice_type;
    }
    if (body.tts_voice !== undefined) {
      const voice = String(body.tts_voice).trim();
      if (!voice) throw new Error('tts_voice não pode ser vazio');
      data.tts_voice = voice.slice(0, 64);
    }
    if (body.tts_model !== undefined) {
      const model = String(body.tts_model).trim();
      if (!model) throw new Error('tts_model não pode ser vazio');
      data.tts_model = model.slice(0, 128);
    }
    if (body.tts_max_chars !== undefined) {
      const n = Number(body.tts_max_chars);
      if (!Number.isFinite(n)) throw new Error('tts_max_chars inválido');
      data.tts_max_chars = Math.min(2000, Math.max(80, Math.round(n)));
    }

    if (Object.keys(data).length === 0) return row;

    return prisma.userSetting.update({
      where: { id: row.id },
      data,
    });
  }

  static async updateSchedule(userId: string, body: UpdateScheduleBody) {
    const row = await this.getOrCreate(userId);
    const data: Record<string, unknown> = {};

    if (body.delay_seconds !== undefined) {
      const n = Number(body.delay_seconds);
      if (!Number.isFinite(n)) throw new Error('delay_seconds inválido');
      data.delay_seconds = Math.min(600, Math.max(0, Math.round(n)));
    }

    if (body.working_hours !== undefined) {
      data.working_hours = normalizeWorkingHours(body.working_hours);
    }

    if (Object.keys(data).length === 0) return row;

    return prisma.userSetting.update({
      where: { id: row.id },
      data,
    });
  }

  static async updateTagging(userId: string, enabled: boolean) {
    if (enabled) await PlanService.assertFeature(userId, 'lead_qualification');
    const row = await UserSettingService.getOrCreate(userId);
    return prisma.userSetting.update({
      where: { id: row.id },
      data: { tagging_enabled: enabled },
    });
  }

  static async isTaggingEnabled(userId: string): Promise<boolean> {
    const row = await prisma.userSetting.findUnique({
      where: { user_id: userId },
      select: { tagging_enabled: true },
    });
    return row?.tagging_enabled === true;
  }

  static async getVoiceCloneStatus(userId: string) {
    const row = await UserSettingService.getOrCreate(userId);
    return {
      tts_voice_type: row.tts_voice_type === 'clone' ? 'clone' : 'preset',
      mistral_voice_id: row.mistral_voice_id,
      has_cloned_voice: !!row.mistral_voice_id?.trim(),
      mistral_configured: !!process.env.MISTRAL_API_KEY?.trim(),
    };
  }

  static async uploadVoiceClone(
    userId: string,
    body: { audio_base64?: string; filename?: string; mime_type?: string },
  ) {
    const { buffer, filename } = parseVoiceCloneUpload(body);
    const row = await UserSettingService.getOrCreate(userId);

    if (row.mistral_voice_id) await MistralVoiceService.deleteClonedVoice(row.mistral_voice_id);

    await saveVoiceCloneSample(userId, buffer, filename);

    const voiceId = await MistralVoiceService.createClonedVoice({
      userId,
      sampleBuffer: buffer,
      sampleFilename: filename,
    });

    const updated = await prisma.userSetting.update({
      where: { id: row.id },
      data: {
        mistral_voice_id: voiceId,
        tts_voice_type: 'clone',
        tts_model: process.env.MISTRAL_TTS_MODEL || 'voxtral-mini-tts-2603',
      },
    });

    return {
      tts_voice_type: updated.tts_voice_type,
      mistral_voice_id: updated.mistral_voice_id,
      has_cloned_voice: true,
    };
  }

  static async removeVoiceClone(userId: string) {
    const row = await UserSettingService.getOrCreate(userId);

    if (row.mistral_voice_id) await MistralVoiceService.deleteClonedVoice(row.mistral_voice_id);

    await deleteVoiceCloneSample(userId);

    const updated = await prisma.userSetting.update({
      where: { id: row.id },
      data: {
        mistral_voice_id: null,
        tts_voice_type: 'preset',
      },
    });

    return {
      tts_voice_type: updated.tts_voice_type,
      mistral_voice_id: null,
      has_cloned_voice: false,
    };
  }

  static async getInstruction(userId: string) {
    return prisma.userInstruction.findFirst({ where: { user_id: userId } });
  }

  static async listActiveInstructions(userId: string) {
    return prisma.userInstruction.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: { updated_at: 'desc' },
      select: { content: true },
    });
  }

  static async upsertInstruction(userId: string, content: string, isActive = true) {
    if (!content) throw new Error('invalid_input');
    const existing = await prisma.userInstruction.findFirst({ where: { user_id: userId } });
    if (existing)
      return prisma.userInstruction.update({ where: { id: existing.id }, data: { content, is_active: isActive } });

    return prisma.userInstruction.create({ data: { user_id: userId, content, is_active: isActive } });
  }

  static parseWhatsappChannel(value: string | null | undefined): 'evolution' | 'official' {
    return value === 'official' ? 'official' : 'evolution';
  }

  /** Ligação QR/Evolution — desactivar (0) na submissão do app à Meta. */
  static isEvolutionChannelEnabled(): boolean {
    const raw = (process.env.WHATSAPP_EVOLUTION_CHANNEL_ENABLED ?? '1').trim().toLowerCase();
    return !['0', 'false', 'off', 'no'].includes(raw);
  }

  static async getWhatsappChannel(userId: string): Promise<'evolution' | 'official'> {
    const settings = await this.getOrCreate(userId);
    return this.parseWhatsappChannel(settings.whatsapp_channel);
  }

  static async setWhatsappChannel(userId: string, channel: string) {
    if (channel !== 'evolution' && channel !== 'official')
      throw new Error('Canal inválido. Use evolution ou official.');
    if (channel === 'evolution' && !UserSettingService.isEvolutionChannelEnabled())
      throw new Error('Canal alternativo indisponível.');

    await prisma.userSetting.update({
      where: { user_id: userId },
      data: { whatsapp_channel: channel },
    });

    return { whatsapp_channel: channel as 'evolution' | 'official' };
  }
}
