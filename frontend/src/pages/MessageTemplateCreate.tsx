import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { PageShellSkeleton } from '../components/ui/Skeleton';
import {
  TemplateWizardStep1,
  TemplateWizardStep2,
  TemplateWizardStep3,
  type TemplateFormState,
} from '../components/templates/TemplateWizardSteps';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { templateService } from '../services/TemplateService';
import { connectionService } from '../services/ConnectionService';
import { getApiErrorMessage } from '../utils/apiError';
import type { TemplateButtonInput, TemplateHeaderInput } from '../types/whatsappTemplate';

const EMPTY_FORM: TemplateFormState = {
  name: '',
  category: 'MARKETING',
  headerMode: 'none',
  headerText: '',
  headerSampleHandle: '',
  headerSampleName: '',
  body: '',
  bodyExamples: [],
  footer: '',
  buttonMode: 'none',
  quickReplies: ['', ''],
  urlButtonText: '',
  urlButtonUrl: '',
  urlButtonExample: '',
  phoneButtonText: '',
  phoneButtonNumber: '',
  copyCodeText: 'Copiar código',
};

const STEP_HINTS: Record<number, string> = {
  1: 'Categoria e nome interno do template.',
  2: 'Cabeçalho, mensagem e rodapé.',
  3: 'Botões e revisão antes de enviar à Meta.',
};

const countVariables = (text: string) => {
  const matches = text.match(/\{\{\d+\}\}/g) ?? [];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((m) => Number.parseInt(m.replace(/\D/g, ''), 10)));
};

const MessageTemplateCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [formData, setFormData] = useState<TemplateFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void connectionService
      .getOverview()
      .then((overview) => {
        setCanCreate(overview.whatsapp_channel === 'official' && overview.official.connected);
      })
      .catch(() => setCanCreate(false))
      .finally(() => setLoading(false));
  }, []);

  const isAuth = formData.category === 'AUTHENTICATION';
  const totalSteps = 3;
  const variableCount = useMemo(() => countVariables(formData.body), [formData.body]);
  const urlVariableCount = useMemo(() => countVariables(formData.urlButtonUrl), [formData.urlButtonUrl]);

  useEffect(() => {
    setFormData((f) => {
      const next = [...f.bodyExamples];
      while (next.length < variableCount) next.push('');
      while (next.length > variableCount) next.pop();
      return next.length === f.bodyExamples.length ? f : { ...f, bodyExamples: next };
    });
  }, [variableCount]);

  const stepHint = useMemo(() => {
    if (activeStep === 2 && isAuth) return 'Texto OTP e botão copiar código.';
    if (activeStep === 3 && isAuth) return 'Revise antes de enviar à Meta.';
    return STEP_HINTS[activeStep] ?? STEP_HINTS[1];
  }, [activeStep, isAuth]);

  const canContinueStep1 = formData.name.trim().length > 0;

  const wizardProps = {
    step: activeStep,
    formData,
    setFormData,
    canCreate,
    uploading,
    onHeaderFile: (e: React.ChangeEvent<HTMLInputElement>) => void onHeaderFile(e),
    onInsertVariable: () => {
      const next = variableCount + 1;
      setFormData((f) => ({ ...f, body: `${f.body}{{${next}}}` }));
    },
    variableCount,
    urlVariableCount,
  };

  const buildHeader = (): TemplateHeaderInput => {
    if (isAuth || formData.headerMode === 'none') return { type: 'none' };
    if (formData.headerMode === 'text') return { type: 'text', text: formData.headerText.trim() };
    return { type: formData.headerMode, sample_handle: formData.headerSampleHandle.trim() };
  };

  const buildButtons = (): TemplateButtonInput[] => {
    if (isAuth || formData.buttonMode === 'none') return [];
    if (formData.buttonMode === 'QUICK_REPLY') {
      return formData.quickReplies.map((t) => t.trim()).filter(Boolean).map((text) => ({ type: 'QUICK_REPLY', text }));
    }
    const buttons: TemplateButtonInput[] = [];
    if (formData.urlButtonText.trim() && formData.urlButtonUrl.trim()) {
      buttons.push({
        type: 'URL',
        text: formData.urlButtonText.trim(),
        url: formData.urlButtonUrl.trim(),
        ...(urlVariableCount > 0 ? { example: formData.urlButtonExample.trim() } : {}),
      });
    }
    if (formData.phoneButtonText.trim() && formData.phoneButtonNumber.trim()) {
      buttons.push({
        type: 'PHONE_NUMBER',
        text: formData.phoneButtonText.trim(),
        phone_number: formData.phoneButtonNumber.trim(),
      });
    }
    return buttons;
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!canContinueStep1) {
        toast.error('Informe o nome do template.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.body.trim()) {
        toast.error('Escreva o texto da mensagem.');
        return false;
      }
      if (isAuth && variableCount < 1) {
        toast.error('Inclua {{1}} no texto para o código OTP.');
        return false;
      }
      if (variableCount > 0 && formData.bodyExamples.some((v) => !v.trim())) {
        toast.error('Preencha os exemplos dos campos personalizados.');
        return false;
      }
      if (!isAuth && formData.headerMode === 'text' && !formData.headerText.trim()) {
        toast.error('Escreva o texto do cabeçalho.');
        return false;
      }
      if (!isAuth && ['image', 'video', 'document'].includes(formData.headerMode) && !formData.headerSampleHandle) {
        toast.error('Envie o ficheiro de amostra do cabeçalho.');
        return false;
      }
      return true;
    }
    if (step === 3 && urlVariableCount > 0 && !formData.urlButtonExample.trim()) {
      toast.error('Preencha o exemplo da variável na URL.');
      return false;
    }
    return true;
  };

  const onHeaderFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await templateService.uploadSample(file);
      setFormData((f) => ({
        ...f,
        headerSampleHandle: result.handle,
        headerSampleName: file.name,
      }));
      toast.success('Ficheiro enviado à Meta.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Falha ao enviar ficheiro.'));
      setFormData((f) => ({ ...f, headerSampleHandle: '', headerSampleName: '' }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const goNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleSubmit = async () => {
    if (!validateStep(2) || !validateStep(3)) return;

    setSaving(true);
    try {
      await templateService.create({
        name: formData.name.trim(),
        category: formData.category,
        body: formData.body.trim(),
        body_examples: variableCount > 0 ? formData.bodyExamples.map((v) => v.trim()) : [],
        footer: isAuth ? null : formData.footer.trim() || null,
        header: buildHeader(),
        buttons: buildButtons(),
        copy_code_text: isAuth ? formData.copyCodeText.trim() : null,
      });
      toast.success('Template enviado à Meta.');
      navigate('/campanhas/templates');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível enviar o template.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageShellSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in flex min-h-[calc(100dvh-9rem)] w-full flex-col">
        <PageHeader
          icon={FileText}
          title="Novo template"
          subtitle={stepHint}
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/campanhas/templates')}
              className="w-full gap-2 sm:w-auto"
              aria-label="Voltar aos templates">
              <ArrowLeft size={18} aria-hidden />
              Voltar
            </Button>
          }
        />

        <div className="w-full flex-1 pt-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+2.5rem)] md:pt-5 sm:pb-[calc(1rem+2.5rem)]">
          {activeStep === 1 ? <TemplateWizardStep1 {...wizardProps} /> : null}
          {activeStep === 2 ? <TemplateWizardStep2 {...wizardProps} /> : null}
          {activeStep === 3 ? <TemplateWizardStep3 {...wizardProps} /> : null}
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-3 z-40 transition-[left] duration-300 md:bottom-4"
        style={{ left: 'var(--layout-sidebar-width, 0px)', right: 0 }}>
        <div className="mx-auto flex max-w-7xl justify-center px-4 md:px-6">
          {activeStep < totalSteps ? (
            <Button
              type="button"
              size="md"
              className="pointer-events-auto min-w-[9.5rem] rounded-lg bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
              onClick={goNext}
              disabled={(activeStep === 1 && !canContinueStep1) || !canCreate || uploading}>
              Próximo passo
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              size="md"
              className="pointer-events-auto min-w-[9.5rem] rounded-lg bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
              onClick={() => void handleSubmit()}
              disabled={saving || !canCreate || uploading || !canContinueStep1}>
              {saving ? (
                <Loader2 size={18} className="animate-spin" strokeWidth={2.25} aria-hidden />
              ) : (
                <Check size={18} strokeWidth={2.25} aria-hidden />
              )}
              {saving ? 'Enviando…' : 'Enviar para aprovação'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MessageTemplateCreate;
