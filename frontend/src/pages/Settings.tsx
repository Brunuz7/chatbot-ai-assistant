import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Settings as SettingsIcon } from 'lucide-react';
import { SettingsTabs, isSettingsTabId, type SettingsTabId } from '../components/settings/SettingsTabs';
import { SettingsSaveBar } from '../components/settings/SettingsPanelCard';
import { settingsAccountFormId } from '../components/settings/SettingsAccountSection';
import { SettingsGeneralSection } from '../components/settings/SettingsGeneralSection';
import { SettingsInstructionsSection } from '../components/settings/SettingsInstructionsSection';
import { SettingsAudioSection } from '../components/settings/SettingsAudioSection';
import { SettingsScheduleSection } from '../components/settings/SettingsScheduleSection';
import { SettingsAccountSection } from '../components/settings/SettingsAccountSection';
import { settingsService } from '../services/SettingsService';
import { instructionService } from '../services/InstructionService';
import { authService } from '../services/AuthService';
import { useAuthProfile } from '../contexts/AuthProfileContext';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { defaultWorkingHours, parseWorkingHours } from '../utils/workingHours';
import type { UpdateProfilePayload } from '../types/auth';
import type { TtsVoiceType } from '../types/settings';
import type { WorkingHours } from '../utils/workingHours';

function tabFromParam(raw: string | null): SettingsTabId {
  return isSettingsTabId(raw) ? raw : 'general';
}

const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabFromParam(searchParams.get('tab'));
  const { profile, loading: profileLoading, refresh: refreshProfile } = useAuthProfile();
  const [loading, setLoading] = useState(true);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [savingTts, setSavingTts] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [uploadingClone, setUploadingClone] = useState(false);
  const [instructionContent, setInstructionContent] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(40);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours);
  const [ttsVoiceType, setTtsVoiceType] = useState<TtsVoiceType>('preset');
  const [ttsVoice, setTtsVoice] = useState('nova');
  const [ttsMaxChars, setTtsMaxChars] = useState(500);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  const [mistralConfigured, setMistralConfigured] = useState(false);

  const setActiveTab = (id: SettingsTabId) => {
    if (id === 'general') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, cloneStatus] = await Promise.all([settingsService.get(), settingsService.getVoiceCloneStatus()]);
      setDelaySeconds(
        typeof settings.delay_seconds === 'number' && settings.delay_seconds >= 0 ? settings.delay_seconds : 40,
      );
      setWorkingHours(parseWorkingHours(settings.working_hours));
      setHasClonedVoice(cloneStatus.has_cloned_voice === true);
      setMistralConfigured(cloneStatus.mistral_configured === true);
      setTtsVoiceType(settings.tts_voice_type === 'clone' && cloneStatus.has_cloned_voice ? 'clone' : 'preset');
      setTtsVoice(settings.tts_voice || 'nova');
      setTtsMaxChars(
        typeof settings.tts_max_chars === 'number' && settings.tts_max_chars > 0 ? settings.tts_max_chars : 500,
      );
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstructions = useCallback(async () => {
    setInstructionsLoading(true);
    try {
      const instruction = await instructionService.get();
      setInstructionContent(instruction?.content ?? '');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível carregar a instrução.'));
    } finally {
      setInstructionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'instructions') void loadInstructions();
  }, [activeTab, loadInstructions]);

  useEffect(() => {
    if (activeTab === 'account') void refreshProfile();
  }, [activeTab, refreshProfile]);

  const saveAccount = async (payload: UpdateProfilePayload) => {
    setSavingAccount(true);
    try {
      await authService.updateProfile(payload);
      await refreshProfile();
      toast.success('Dados da conta guardados.');
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
        const errCode = (e.response.data as { error?: string }).error;
        if (errCode === 'user_exists') {
          toast.error('Este e-mail já está em uso.');
          return;
        }
        if (errCode === 'invalid_phone') {
          toast.error('Informe um telefone válido com DDD.');
          return;
        }
        if (errCode === 'invalid_password') {
          toast.error('A nova senha deve ter pelo menos 6 caracteres.');
          return;
        }
        if (errCode === 'invalid_input') {
          toast.error('Verifique os campos obrigatórios.');
          return;
        }
      }
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível guardar os dados da conta.'));
    } finally {
      setSavingAccount(false);
    }
  };

  const saveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await instructionService.save({ content: instructionContent, is_active: true });
      toast.success('Instrução salva com sucesso.');
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
        const errCode = (e.response.data as { error?: string }).error;
        if (errCode === 'invalid_input') {
          toast.error('Preencha a instrução antes de salvar.');
          return;
        }
      }
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar a instrução.'));
    } finally {
      setSavingInstructions(false);
    }
  };

  const saveTtsReply = async () => {
    setSavingTts(true);
    try {
      const updated = await settingsService.updateTtsReply({
        tts_voice_type: ttsVoiceType,
        tts_voice: ttsVoice,
        tts_max_chars: ttsMaxChars,
      });
      setTtsVoiceType(updated.tts_voice_type === 'clone' ? 'clone' : 'preset');
      setTtsVoice(updated.tts_voice || 'nova');
      setTtsMaxChars(updated.tts_max_chars ?? 500);
      toast.success('Configurações de resposta em áudio guardadas.');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar as configurações de áudio.'));
    } finally {
      setSavingTts(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const updated = await settingsService.updateSchedule({
        delay_seconds: delaySeconds,
        working_hours: workingHours,
      });
      setDelaySeconds(updated.delay_seconds ?? delaySeconds);
      setWorkingHours(parseWorkingHours(updated.working_hours));
      toast.success('Horário de resposta guardado.');
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar o horário de resposta.'));
    } finally {
      setSavingSchedule(false);
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

      await settingsService.uploadVoiceClone({
        audio_base64: base64,
        filename: file.name,
        mime_type: file.type || 'audio/mpeg',
      });

      setHasClonedVoice(true);
      setTtsVoiceType('clone');
      toast.success('Voz clonada com sucesso. Guarde as configurações de áudio.');
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
      await settingsService.deleteVoiceClone();
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

  const saveBar =
    activeTab === 'instructions' && !instructionsLoading
      ? {
          label: 'Salvar instruções',
          saving: savingInstructions,
          disabled: savingInstructions,
          onClick: () => void saveInstructions(),
        }
      : activeTab === 'audio' && !loading
        ? {
            label: 'Salvar áudio',
            saving: savingTts,
            disabled: savingTts,
            onClick: () => void saveTtsReply(),
          }
        : activeTab === 'schedule' && !loading
          ? {
              label: 'Salvar horário',
              saving: savingSchedule,
              disabled: savingSchedule,
              onClick: () => void saveSchedule(),
            }
          : activeTab === 'account' && !profileLoading
            ? {
                type: 'submit' as const,
                form: settingsAccountFormId,
                label: 'Salvar conta',
                saving: savingAccount,
                disabled: savingAccount,
              }
            : null;

  return (
    <Layout>
      <div className="w-full animate-fade-in">
        <PageHeader
          icon={SettingsIcon}
          title="Configurações"
          subtitle="Aparência, instruções, áudio, horários e conta."
        />

        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
          <aside className="-mx-6 shrink-0 self-start lg:sticky lg:top-0 lg:mx-0 lg:w-52 xl:w-56">
            <SettingsTabs active={activeTab} onChange={setActiveTab} />
          </aside>

          <div className="min-w-0 w-full flex-1">
            {activeTab === 'general' ? <SettingsGeneralSection /> : null}

            {activeTab === 'instructions' ? (
              <SettingsInstructionsSection
                loading={instructionsLoading}
                saving={savingInstructions}
                content={instructionContent}
                onContentChange={setInstructionContent}
              />
            ) : null}

            {activeTab === 'audio' ? (
              <SettingsAudioSection
                loading={loading}
                saving={savingTts}
                uploadingClone={uploadingClone}
                ttsVoiceType={ttsVoiceType}
                ttsVoice={ttsVoice}
                ttsMaxChars={ttsMaxChars}
                hasClonedVoice={hasClonedVoice}
                mistralConfigured={mistralConfigured}
                onTtsVoiceTypeChange={setTtsVoiceType}
                onTtsVoiceChange={setTtsVoice}
                onTtsMaxCharsChange={setTtsMaxChars}
                onUploadClone={(file) => void uploadVoiceClone(file)}
                onRemoveClone={() => void removeVoiceClone()}
              />
            ) : null}

            {activeTab === 'schedule' ? (
              <SettingsScheduleSection
                loading={loading}
                saving={savingSchedule}
                delaySeconds={delaySeconds}
                workingHours={workingHours}
                onDelaySecondsChange={setDelaySeconds}
                onWorkingHoursChange={setWorkingHours}
              />
            ) : null}

            {activeTab === 'account' ? (
              <SettingsAccountSection
                loading={profileLoading}
                saving={savingAccount}
                profile={profile}
                onSave={(payload) => void saveAccount(payload)}
              />
            ) : null}
          </div>
        </div>
      </div>
      {saveBar ? <SettingsSaveBar {...saveBar} /> : null}
    </Layout>
  );
};

export default SettingsPage;
