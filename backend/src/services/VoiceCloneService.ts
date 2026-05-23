import { deleteVoiceCloneSample, saveVoiceCloneSample } from '../lib/voiceCloneStorage.js';
import { parseVoiceCloneUpload } from '../lib/voiceCloneAudio.js';
import { prisma } from '../lib/prisma.js';
import { MistralVoiceService } from './MistralVoiceService.js';
import { UserSettingService } from './UserSettingService.js';

export class VoiceCloneService {
  static async getStatus(userId: string) {
    const row = await UserSettingService.getOrCreate(userId);
    return {
      tts_voice_type: row.tts_voice_type === 'clone' ? 'clone' : 'preset',
      mistral_voice_id: row.mistral_voice_id,
      has_cloned_voice: !!row.mistral_voice_id?.trim(),
      mistral_configured: !!process.env.MISTRAL_API_KEY?.trim(),
    };
  }

  static async uploadAndClone(
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

  static async removeClone(userId: string) {
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
}
