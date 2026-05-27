import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Settings, Loader2, Mic } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

type TtsVoiceType = 'preset' | 'clone';

interface UserSettings {
  tts_reply_enabled: boolean;
  tts_voice_type?: TtsVoiceType;
  tts_voice: string;
  tts_model: string;
  tts_max_chars: number;
  mistral_voice_id?: string | null;
  has_cloned_voice?: boolean;
}

interface VoiceCloneStatus {
  has_cloned_voice: boolean;
  mistral_configured: boolean;
  tts_voice_type: TtsVoiceType;
}

const TTS_VOICES = [
  { id: 'nova', label: 'Nova' },
  { id: 'alloy', label: 'Alloy' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'coral', label: 'Coral' },
  { id: 'sage', label: 'Sage' },
];

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingTts, setSavingTts] = useState(false);
  const [uploadingClone, setUploadingClone] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoiceType, setTtsVoiceType] = useState<TtsVoiceType>('preset');
  const [ttsVoice, setTtsVoice] = useState('nova');
  const [ttsMaxChars, setTtsMaxChars] = useState(500);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  const [mistralConfigured, setMistralConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, cloneRes] = await Promise.all([
        api.get<UserSettings>('/api/settings'),
        api.get<VoiceCloneStatus>('/api/settings/voice-clone'),
      ]);
      const res = settingsRes;
      setTtsEnabled(res.data.tts_reply_enabled === true);
      setHasClonedVoice(cloneRes.data.has_cloned_voice === true);
      setMistralConfigured(cloneRes.data.mistral_configured === true);
      setTtsVoiceType(
        res.data.tts_voice_type === 'clone' && cloneRes.data.has_cloned_voice
          ? 'clone'
          : 'preset',
      );
      setTtsVoice(res.data.tts_voice || 'nova');
      setTtsMaxChars(
        typeof res.data.tts_max_chars === 'number' && res.data.tts_max_chars > 0
          ? res.data.tts_max_chars
          : 500,
      );
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTtsReply = async () => {
    setSavingTts(true);
    try {
      const res = await api.patch<UserSettings>('/api/settings/tts-reply', {
        tts_reply_enabled: ttsEnabled,
        tts_voice_type: ttsVoiceType,
        tts_voice: ttsVoice,
        tts_max_chars: ttsMaxChars,
      });
      setTtsEnabled(res.data.tts_reply_enabled === true);
      setTtsVoiceType(res.data.tts_voice_type === 'clone' ? 'clone' : 'preset');
      setTtsVoice(res.data.tts_voice || 'nova');
      setTtsMaxChars(res.data.tts_max_chars ?? 500);
      toast.success('Configurações de resposta em áudio guardadas.');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar as configurações de áudio.'));
    } finally {
      setSavingTts(false);
    }
  };

  const uploadVoiceClone = async (file: File) => {
    setUploadingClone(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const part = result.includes(',') ? result.split(',')[1] : result;
          resolve(part);
        };
        reader.onerror = () => reject(new Error('Falha ao ler ficheiro'));
        reader.readAsDataURL(file);
      });

      await api.post('/api/settings/voice-clone', {
        audio_base64: base64,
        filename: file.name,
        mime_type: file.type || 'audio/mpeg',
      });

      setHasClonedVoice(true);
      setTtsVoiceType('clone');
      toast.success('Voz clonada com sucesso. Active respostas em áudio e guarde.');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível clonar a voz.'));
    } finally {
      setUploadingClone(false);
    }
  };

  const removeVoiceClone = async () => {
    setUploadingClone(true);
    try {
      await api.delete('/api/settings/voice-clone');
      setHasClonedVoice(false);
      setTtsVoiceType('preset');
      toast.success('Voz clonada removida.');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível remover a voz clonada.'));
    } finally {
      setUploadingClone(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={Settings}
          title="Configurações"
          subtitle="Preferências da conta e respostas em áudio."
        />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Respostas em áudio</h2>
          </div>
          <Card className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 py-4">
                <Loader2 className="animate-spin" size={20} />
                A carregar…
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Voz usada nos fluxos com ações <strong>Enviar áudio</strong> ou{' '}
                  <strong>Responder em áudio</strong>. Vozes prontas (OpenRouter) ou{' '}
                  <strong>clonada</strong> (Mistral Voxtral). A transcrição de áudios recebidos usa
                  OpenRouter (STT).
                </p>

                {!mistralConfigured && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
                    Para clonar a sua voz, configure <code className="text-xs">MISTRAL_API_KEY</code>{' '}
                    no servidor (.env).
                  </p>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={ttsEnabled}
                    disabled={savingTts}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Activar respostas em áudio
                  </span>
                </label>

                {ttsEnabled && (
                  <div className="space-y-4 pl-1 border-l-2 border-primary/30 ml-1">
                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tipo de voz
                      </span>
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="ttsVoiceType"
                            checked={ttsVoiceType === 'preset'}
                            disabled={savingTts || uploadingClone}
                            onChange={() => setTtsVoiceType('preset')}
                          />
                          <span className="text-sm">Voz pronta</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="ttsVoiceType"
                            checked={ttsVoiceType === 'clone'}
                            disabled={savingTts || uploadingClone || !hasClonedVoice}
                            onChange={() => setTtsVoiceType('clone')}
                          />
                          <span className="text-sm">Minha voz (clonada)</span>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/80 dark:bg-slate-900/40 mb-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Clonar a sua voz
                      </p>
                      <p className="text-xs text-slate-500">
                        Envie 10–20 segundos de áudio claro (só a sua voz, sem música). MP3, WAV,
                        OGG ou WebM. Grave com volume normal — o sistema normaliza antes de enviar
                        no WhatsApp.
                      </p>
                      {hasClonedVoice ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Voz clonada activa
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingClone}
                            onClick={() => void removeVoiceClone()}
                          >
                            Remover clone
                          </Button>
                        </div>
                      ) : null}
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="audio/*"
                          className="sr-only"
                          disabled={uploadingClone || !mistralConfigured}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadVoiceClone(file);
                            e.target.value = '';
                          }}
                        />
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer ${
                            mistralConfigured
                              ? 'border-primary text-primary hover:bg-primary/5'
                              : 'border-slate-300 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {uploadingClone ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Mic size={16} />
                          )}
                          {hasClonedVoice ? 'Substituir amostra' : 'Enviar amostra de voz'}
                        </span>
                      </label>
                    </div>

                    {ttsVoiceType === 'preset' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Voz pronta (OpenRouter)
                        </label>
                        <select
                          className="w-full max-w-md rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                          value={ttsVoice}
                          disabled={savingTts}
                          onChange={(e) => setTtsVoice(e.target.value)}
                        >
                          {TTS_VOICES.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tamanho máximo do texto para voz (caracteres)
                      </label>
                      <input
                        type="number"
                        min={80}
                        max={2000}
                        className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                        value={ttsMaxChars}
                        disabled={savingTts}
                        onChange={(e) => setTtsMaxChars(Number(e.target.value) || 500)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Respostas mais longas são cortadas na síntese de voz (o texto completo
                        permanece no histórico).
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={savingTts || loading}
                  onClick={() => void saveTtsReply()}
                  className="gap-2"
                >
                  {savingTts ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
                  Salvar áudio
                </Button>
              </>
            )}
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default SettingsPage;
