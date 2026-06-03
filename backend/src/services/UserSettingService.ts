import { deleteVoiceCloneSample, saveVoiceCloneSample } from '../lib/voiceCloneStorage.js';
import { parseVoiceCloneUpload } from '../lib/voiceCloneAudio.js';
import { prisma } from '../lib/prisma.js';
import type { TtsReplySettings, UpdateTtsReplyBody } from '../types/userSettingTypes.js';
import { MistralVoiceService } from './MistralVoiceService.js';

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
        tts_voice: DEFAULT_TTS_VOICE,
        tts_model: DEFAULT_TTS_MODEL,
        tts_max_chars: DEFAULT_TTS_MAX_CHARS,
      },
    });
  }

  static toTtsReplySettings(row: {
    tts_reply_enabled: boolean;
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

    if (typeof body.tts_reply_enabled === 'boolean') {
      data.tts_reply_enabled = body.tts_reply_enabled;
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

  static async getVoiceCloneStatus(userId: string) {
    const row = await UserSettingService.getOrCreate(userId);
    return {
      tts_voice_type: row.tts_voice_type === 'clone' ? 'clone' : 'preset', mistral_voice_id: row.mistral_voice_id,
      has_cloned_voice: !!row.mistral_voice_id?.trim(), mistral_configured: !!process.env.MISTRAL_API_KEY?.trim(),
    };
  }

  static async uploadVoiceClone(
    userId: string,
    body: { audio_base64?: string; filename?: string; mime_type?: string },
  ) {
    const { buffer, filename } = parseVoiceCloneUpload(body);
    const row = await UserSettingService.getOrCreate(userId);

    if (row.mistral_voice_id) {
      await MistralVoiceService.deleteClonedVoice(row.mistral_voice_id);
    }

    await saveVoiceCloneSample(userId, buffer, filename);

    const voiceId = await MistralVoiceService.createClonedVoice({
      userId,
      sampleBuffer: buffer,
      sampleFilename: filename,
    });

    const updated = await prisma.userSetting.update({
      where: { id: row.id },
      data: { mistral_voice_id: voiceId, tts_voice_type: 'clone', tts_model: process.env.MISTRAL_TTS_MODEL || 'voxtral-mini-tts-2603' },
    });

    return { tts_voice_type: updated.tts_voice_type, mistral_voice_id: updated.mistral_voice_id, has_cloned_voice: true };
  }

  static async removeVoiceClone(userId: string) {
    const row = await UserSettingService.getOrCreate(userId);

    if (row.mistral_voice_id) {
      await MistralVoiceService.deleteClonedVoice(row.mistral_voice_id);
    }
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
    if (existing) {
      return prisma.userInstruction.update({ where: { id: existing.id }, data: { content, is_active: isActive } });
    }
    return prisma.userInstruction.create({ data: { user_id: userId, content, is_active: isActive } });
  }
}
