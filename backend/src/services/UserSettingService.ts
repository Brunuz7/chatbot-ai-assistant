import { parseTtsReplyMode, TTS_REPLY_MODES } from '../lib/ttsReplyPolicy.js';
import { prisma } from '../lib/prisma.js';
import type { TtsReplySettings, UpdateTtsReplyBody } from '../types/userSettingTypes.js';

const DEFAULT_WORKING_HOURS = { timezone: 'America/Sao_Paulo', days: {} };
const DEFAULT_HOLIDAYS: unknown[] = [];
const DEFAULT_TTS_MODEL = 'openai/gpt-4o-mini-tts-2025-12-15';
const DEFAULT_TTS_VOICE = 'nova';
const DEFAULT_TTS_MAX_CHARS = 500;

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
        tts_reply_enabled: false,
        tts_reply_mode: 'when_contact_sent_audio',
        tts_voice: DEFAULT_TTS_VOICE,
        tts_model: DEFAULT_TTS_MODEL,
        tts_max_chars: DEFAULT_TTS_MAX_CHARS,
      },
    });
  }

  static toTtsReplySettings(row: {
    tts_reply_enabled: boolean;
    tts_reply_mode: string;
    tts_voice_type: string;
    tts_voice: string;
    tts_model: string;
    tts_max_chars: number;
    mistral_voice_id: string | null;
  }): TtsReplySettings {
    const voiceType = row.tts_voice_type === 'clone' ? 'clone' : 'preset';
    const mistralVoiceId = row.mistral_voice_id?.trim() || null;
    return {
      tts_reply_enabled: row.tts_reply_enabled === true,
      tts_reply_mode: parseTtsReplyMode(row.tts_reply_mode),
      tts_voice_type:
        voiceType === 'clone' && mistralVoiceId ? 'clone' : 'preset',
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

    if (typeof body.tts_reply_enabled === 'boolean') {
      data.tts_reply_enabled = body.tts_reply_enabled;
    }
    if (body.tts_reply_mode !== undefined) {
      if (!TTS_REPLY_MODES.includes(body.tts_reply_mode)) {
        throw new Error('tts_reply_mode inválido');
      }
      data.tts_reply_mode = body.tts_reply_mode;
    }
    if (body.tts_voice_type !== undefined) {
      if (body.tts_voice_type !== 'preset' && body.tts_voice_type !== 'clone') {
        throw new Error('tts_voice_type inválido');
      }
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

    if (Object.keys(data).length === 0) {
      return row;
    }

    return prisma.userSetting.update({
      where: { id: row.id },
      data,
    });
  }

  static async updateLeadQualification(userId: string, enabled: boolean) {
    const row = await UserSettingService.getOrCreate(userId);
    return prisma.userSetting.update({
      where: { id: row.id },
      data: { tagging_enabled: enabled },
    });
  }

  static async isLeadQualificationEnabled(userId: string): Promise<boolean> {
    const row = await prisma.userSetting.findUnique({
      where: { user_id: userId },
      select: { tagging_enabled: true },
    });
    return row?.tagging_enabled === true;
  }
}
