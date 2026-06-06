import { Loader2, Mic } from 'lucide-react';
import { FormBlockSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { SettingsRow, SettingsSection } from './SettingsPanelCard';
import { settingsControlClass } from './settingsUi';
import type { TtsVoiceType } from '../../types/settings';

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

export type SettingsAudioSectionProps = {
  loading: boolean;
  saving: boolean;
  uploadingClone: boolean;
  ttsVoiceType: TtsVoiceType;
  ttsVoice: string;
  ttsMaxChars: number;
  hasClonedVoice: boolean;
  mistralConfigured: boolean;
  onTtsVoiceTypeChange: (v: TtsVoiceType) => void;
  onTtsVoiceChange: (v: string) => void;
  onTtsMaxCharsChange: (v: number) => void;
  onUploadClone: (file: File) => void;
  onRemoveClone: () => void;
};

export function SettingsAudioSection({
  loading,
  saving,
  uploadingClone,
  ttsVoiceType,
  ttsVoice,
  ttsMaxChars,
  hasClonedVoice,
  mistralConfigured,
  onTtsVoiceTypeChange,
  onTtsVoiceChange,
  onTtsMaxCharsChange,
  onUploadClone,
  onRemoveClone,
}: SettingsAudioSectionProps) {
  return (
    <SettingsSection
      title="Áudio"
      description="Voz nos fluxos com áudio (activada no fluxo).">
      {loading ? (
        <div className="py-5">
          <FormBlockSkeleton rows={6} />
        </div>
      ) : (
        <>
          {!mistralConfigured ? (
            <div className="py-4">
              <p className="rounded-lg border border-warning-muted/30 bg-warning-muted/20 px-3 py-2.5 text-sm text-warning-text">
                Para clonar a sua voz, configure <code className="text-xs">MISTRAL_API_KEY</code> no servidor (.env).
              </p>
            </div>
          ) : null}

          <SettingsRow
            label="Tipo de voz"
            description="Voz pronta (OpenRouter) ou clonada a partir de uma amostra sua (Mistral Voxtral)."
            control={
              <div className="flex w-full rounded-lg border border-border bg-surface-inset p-1">
                {(
                  [
                    { id: 'preset' as const, label: 'Pronta', disabled: false },
                    { id: 'clone' as const, label: 'Clonada', disabled: !hasClonedVoice },
                  ] as const
                ).map(({ id, label, disabled }) => {
                  const active = ttsVoiceType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={saving || uploadingClone || disabled}
                      onClick={() => onTtsVoiceTypeChange(id)}
                      className={`flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
                          : 'text-foreground-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            }
          />

          <SettingsRow
            label="Clonar a sua voz"
            description="Envie 10–20 segundos de áudio claro (só a sua voz, sem música). MP3, WAV, OGG ou WebM."
            control={
              <div className="flex w-full flex-col gap-3">
                {hasClonedVoice ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-success-text">Voz clonada ativa</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={settingsControlClass}
                      disabled={uploadingClone}
                      onClick={onRemoveClone}>
                      Remover clone
                    </Button>
                  </div>
                ) : null}
                <label className="flex w-full">
                  <input
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    disabled={uploadingClone || !mistralConfigured}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadClone(file);
                      e.target.value = '';
                    }}
                  />
                  <span
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
                      mistralConfigured
                        ? 'border-primary text-primary hover:bg-primary-a5'
                        : 'cursor-not-allowed border-border-subtle text-foreground-icon'
                    }`}>
                    {uploadingClone ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
                    {hasClonedVoice ? 'Substituir amostra' : 'Enviar amostra de voz'}
                  </span>
                </label>
              </div>
            }
          />

          {ttsVoiceType === 'preset' ? (
            <SettingsRow
              label="Voz pronta"
              description="Modelo de voz OpenRouter para síntese de fala."
              control={
                <Select
                  className="!rounded-lg w-full"
                  value={ttsVoice}
                  disabled={saving}
                  onChange={(e) => onTtsVoiceChange(e.target.value)}>
                  {TTS_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              }
            />
          ) : null}

          <SettingsRow
            label="Limite de caracteres"
            description="Respostas mais longas são cortadas na síntese de voz. O texto completo permanece no histórico."
            control={
              <Input
                type="number"
                className="!rounded-lg w-full"
                min={80}
                max={2000}
                value={ttsMaxChars}
                disabled={saving}
                onChange={(e) => onTtsMaxCharsChange(Number(e.target.value) || 500)}
              />
            }
          />
        </>
      )}
    </SettingsSection>
  );
}
