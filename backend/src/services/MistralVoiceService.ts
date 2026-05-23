import axios from 'axios';

const MISTRAL_API_BASE = (process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1').replace(
  /\/$/,
  '',
);
const VOXTRAL_TTS_MODEL = process.env.MISTRAL_TTS_MODEL || 'voxtral-mini-tts-2603';

export class MistralVoiceService {
  private static getApiKey(): string {
    const key = process.env.MISTRAL_API_KEY?.trim();
    if (!key) {
      throw new Error(
        'MISTRAL_API_KEY não configurada. Necessária para clonar voz (Voxtral). Defina no .env.',
      );
    }
    return key;
  }

  private static headers() {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      'Content-Type': 'application/json',
    };
  }

  private static normalizeError(err: unknown): string {
    const anyErr = err as { response?: { data?: unknown }; message?: string };
    const remote = anyErr?.response?.data ?? anyErr?.message ?? String(anyErr);
    return typeof remote === 'string' ? remote : JSON.stringify(remote);
  }

  /** Cria voz clonada na Mistral a partir de amostra de áudio (base64). */
  static async createClonedVoice(params: {
    userId: string;
    sampleBuffer: Buffer;
    sampleFilename: string;
  }): Promise<string> {
    const voiceName = `prestei-${params.userId.slice(0, 8)}-${Date.now()}`;

    try {
      const resp = await axios.post(
        `${MISTRAL_API_BASE}/audio/voices`,
        {
          name: voiceName,
          sample_audio: params.sampleBuffer.toString('base64'),
          sample_filename: params.sampleFilename,
          languages: ['pt', 'en'],
        },
        { headers: this.headers(), timeout: 120_000 },
      );

      const id = resp.data?.id;
      if (typeof id !== 'string' || !id.trim()) {
        throw new Error('Mistral não devolveu voice_id');
      }
      return id.trim();
    } catch (err) {
      const message = this.normalizeError(err);
      console.error('Mistral createClonedVoice falhou:', message);
      throw new Error(`Falha ao clonar voz: ${message}`);
    }
  }

  static async deleteClonedVoice(voiceId: string): Promise<void> {
    if (!voiceId.trim()) return;
    try {
      await axios.delete(`${MISTRAL_API_BASE}/audio/voices/${encodeURIComponent(voiceId)}`, {
        headers: this.headers(),
        timeout: 30_000,
      });
    } catch (err) {
      const message = this.normalizeError(err);
      console.warn('Mistral deleteClonedVoice:', message);
    }
  }

  /** Sintetiza fala com voice_id clonado (Voxtral). */
  static async synthesizeWithClonedVoice(params: {
    text: string;
    voiceId: string;
  }): Promise<Buffer> {
    const input = params.text.trim();
    if (!input) throw new Error('Texto vazio para síntese de voz');

    try {
      const resp = await axios.post(
        `${MISTRAL_API_BASE}/audio/speech`,
        {
          model: VOXTRAL_TTS_MODEL,
          input,
          voice_id: params.voiceId,
          response_format: 'mp3',
        },
        { headers: this.headers(), timeout: 120_000 },
      );

      const audioData = resp.data?.audio_data;
      if (typeof audioData !== 'string' || !audioData.trim()) {
        throw new Error('Resposta Mistral TTS sem audio_data');
      }

      const buf = Buffer.from(audioData, 'base64');
      if (!buf.length) throw new Error('Áudio sintetizado vazio');
      return buf;
    } catch (err) {
      const message = this.normalizeError(err);
      console.error('Mistral synthesizeWithClonedVoice falhou:', message);
      throw new Error(`Falha ao gerar áudio com voz clonada: ${message}`);
    }
  }
}
