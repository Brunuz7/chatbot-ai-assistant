import api from './api';
import type {
  SchedulePayload,
  TtsReplyPayload,
  UserSettings,
  VoiceCloneStatus,
  VoiceCloneUploadPayload,
} from '../types/settings';

export class SettingsService {
  async get(): Promise<UserSettings> {
    const { data } = await api.get<UserSettings>('/settings');
    return data;
  }

  async getVoiceCloneStatus(): Promise<VoiceCloneStatus> {
    const { data } = await api.get<VoiceCloneStatus>('/settings/voice-clone');
    return data;
  }

  async updateSchedule(payload: SchedulePayload): Promise<UserSettings> {
    const { data } = await api.patch<UserSettings>('/settings/schedule', payload);
    return data;
  }

  async updateTtsReply(payload: TtsReplyPayload): Promise<UserSettings> {
    const { data } = await api.patch<UserSettings>('/settings/tts-reply', payload);
    return data;
  }

  async uploadVoiceClone(payload: VoiceCloneUploadPayload): Promise<void> {
    await api.post('/settings/voice-clone', payload);
  }

  async deleteVoiceClone(): Promise<void> {
    await api.delete('/settings/voice-clone');
  }
}

export const settingsService = new SettingsService();
