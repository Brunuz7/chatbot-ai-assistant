import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { Input, TextArea } from '../ui/Input';
import { WizardSection } from '../flows/WizardSection';
import { FlowWizardSummaryRow } from '../flows/FlowWizardSummaryRow';
import { TemplateOptionPicker } from './TemplateOptionPicker';
import {
  TEMPLATE_BUTTON_LABELS,
  TEMPLATE_BUTTON_OPTIONS,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_OPTIONS,
  TEMPLATE_HEADER_LABELS,
  TEMPLATE_HEADER_OPTIONS,
  TEMPLATE_WIZARD_ICONS,
} from './templateWizardConstants';
import type { TemplateButtonMode, TemplateHeaderMode, WhatsAppTemplateCategory } from '../../types/whatsappTemplate';

export type TemplateFormState = {
  name: string;
  category: WhatsAppTemplateCategory;
  headerMode: TemplateHeaderMode;
  headerText: string;
  headerSampleHandle: string;
  headerSampleName: string;
  body: string;
  bodyExamples: string[];
  footer: string;
  buttonMode: TemplateButtonMode;
  quickReplies: string[];
  urlButtonText: string;
  urlButtonUrl: string;
  urlButtonExample: string;
  phoneButtonText: string;
  phoneButtonNumber: string;
  copyCodeText: string;
};

type TemplateWizardStepsProps = {
  step: number;
  formData: TemplateFormState;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  canCreate: boolean;
  uploading: boolean;
  onHeaderFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInsertVariable: () => void;
  variableCount: number;
  urlVariableCount: number;
};

export const TemplateWizardStep1: React.FC<TemplateWizardStepsProps> = ({
  formData,
  setFormData,
  canCreate,
}) => {
  return (
    <div className="animate-slide-in-right space-y-5">
      {!canCreate ? (
        <WizardSection icon={TEMPLATE_WIZARD_ICONS.basic} title="WhatsApp Oficial necessário">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Templates são enviados à Meta e exigem o canal WhatsApp Oficial. Configure em{' '}
            <Link to="/configuracoes" className="font-medium text-primary hover:underline">
              Configurações
            </Link>
            .
          </p>
        </WizardSection>
      ) : null}

      <WizardSection
        icon={TEMPLATE_WIZARD_ICONS.basic}
        title="Informações básicas"
        description="Categoria na Meta e nome interno (só você vê). Idioma fixo: pt_BR.">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Categoria</p>
            <TemplateOptionPicker
              value={formData.category}
              onChange={(id) =>
                setFormData((f) => ({
                  ...f,
                  category: id,
                  headerMode: id === 'AUTHENTICATION' ? 'none' : f.headerMode,
                  buttonMode: id === 'AUTHENTICATION' ? 'none' : f.buttonMode,
                  body: id === 'AUTHENTICATION' && !f.body.trim() ? 'O seu código é {{1}}.' : f.body,
                }))
              }
              options={TEMPLATE_CATEGORY_OPTIONS}
              ariaLabel="Categoria do template"
              columns="3"
              disabled={!canCreate}
            />
          </div>
          <Input
            label="Nome deste template"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: promo_maio"
            disabled={!canCreate}
          />
          <p className="text-xs leading-relaxed text-slate-500">
            Use letras minúsculas, números e underscore (ex.:{' '}
            <code className="text-slate-700 dark:text-slate-300">black_friday</code>).
          </p>
        </div>
      </WizardSection>
    </div>
  );
};

export const TemplateWizardStep2: React.FC<TemplateWizardStepsProps> = ({
  formData,
  setFormData,
  canCreate,
  uploading,
  onHeaderFile,
  onInsertVariable,
  variableCount,
}) => {
  const isAuth = formData.category === 'AUTHENTICATION';

  return (
    <div className="animate-slide-in-right space-y-5">
      {!isAuth ? (
        <WizardSection
          icon={TEMPLATE_WIZARD_ICONS.content}
          title="Cabeçalho"
          description="Opcional — texto ou ficheiro no topo da mensagem.">
          <div className="space-y-4">
            <TemplateOptionPicker
              value={formData.headerMode}
              onChange={(id) =>
                setFormData((f) => ({
                  ...f,
                  headerMode: id,
                  headerSampleHandle: '',
                  headerSampleName: '',
                }))
              }
              options={TEMPLATE_HEADER_OPTIONS}
              ariaLabel="Tipo de cabeçalho"
              columns="5"
              disabled={!canCreate}
            />
            {formData.headerMode === 'text' ? (
              <Input
                label="Texto do cabeçalho"
                required
                value={formData.headerText}
                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                placeholder="Ex.: Oferta especial"
                maxLength={60}
                disabled={!canCreate}
              />
            ) : null}
            {['image', 'video', 'document'].includes(formData.headerMode) ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-900/30">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Ficheiro de amostra
                </label>
                <input
                  type="file"
                  accept={
                    formData.headerMode === 'image'
                      ? 'image/jpeg,image/png'
                      : formData.headerMode === 'video'
                        ? 'video/mp4'
                        : 'application/pdf'
                  }
                  onChange={onHeaderFile}
                  disabled={!canCreate || uploading}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                {uploading ? (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 size={14} className="animate-spin" aria-hidden /> A enviar à Meta…
                  </p>
                ) : formData.headerSampleName ? (
                  <p className="mt-2 text-xs font-medium text-primary">{formData.headerSampleName}</p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">A Meta exige uma amostra para aprovar este cabeçalho.</p>
                )}
              </div>
            ) : null}
          </div>
        </WizardSection>
      ) : null}

      <WizardSection
        icon={TEMPLATE_WIZARD_ICONS.content}
        title={isAuth ? 'Mensagem OTP' : 'Corpo da mensagem'}
        description={
          isAuth
            ? 'Inclua {{1}} onde o código será inserido ao enviar.'
            : 'Texto principal. Use campos personalizados para nome, data, etc.'
        }>
        <div className="space-y-4">
          <TextArea
            label="Texto"
            required
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={4}
            placeholder={isAuth ? 'O seu código é {{1}}.' : 'Olá {{1}}! Temos novidade até {{2}}.'}
            disabled={!canCreate}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canCreate}
              onClick={onInsertVariable}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-a10 dark:border-slate-700 dark:bg-slate-900">
              + Campo personalizado
            </button>
            <span className="text-xs text-slate-500">Gera {'{{1}}'}, {'{{2}}'}… na posição do cursor.</span>
          </div>
          {variableCount > 0
            ? formData.bodyExamples.map((value, idx) => (
                <Input
                  key={idx}
                  label={`Exemplo de {{${idx + 1}}} (obrigatório para a Meta)`}
                  required
                  value={value}
                  onChange={(e) =>
                    setFormData((f) => {
                      const next = [...f.bodyExamples];
                      next[idx] = e.target.value;
                      return { ...f, bodyExamples: next };
                    })
                  }
                  placeholder={idx === 0 ? 'Maria' : '31/12'}
                  disabled={!canCreate}
                />
              ))
            : null}
        </div>
      </WizardSection>

      {!isAuth ? (
        <WizardSection icon={TEMPLATE_WIZARD_ICONS.content} title="Rodapé" description="Opcional — linha pequena abaixo do texto.">
          <Input
            label="Texto do rodapé"
            value={formData.footer}
            onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
            placeholder="Ex.: Responda SAIR para cancelar."
            maxLength={60}
            disabled={!canCreate}
          />
        </WizardSection>
      ) : (
        <WizardSection icon={TEMPLATE_WIZARD_ICONS.buttons} title="Botão copiar código">
          <Input
            label="Texto do botão"
            value={formData.copyCodeText}
            onChange={(e) => setFormData({ ...formData, copyCodeText: e.target.value })}
            disabled={!canCreate}
          />
        </WizardSection>
      )}
    </div>
  );
};

export const TemplateWizardStep3: React.FC<TemplateWizardStepsProps> = ({
  formData,
  setFormData,
  canCreate,
  urlVariableCount,
}) => {
  const isAuth = formData.category === 'AUTHENTICATION';
  const bodyPreview = formData.body.trim() || '—';
  const footerPreview = formData.footer.trim() || '—';
  const quickPreview = formData.quickReplies.map((t) => t.trim()).filter(Boolean).join(', ') || '—';
  const ctaPreview = [
    formData.urlButtonText.trim() ? `URL: ${formData.urlButtonText.trim()}` : '',
    formData.phoneButtonText.trim() ? `Tel.: ${formData.phoneButtonText.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' · ') || '—';

  return (
    <div className="animate-slide-in-right space-y-5">
      {!isAuth ? (
        <WizardSection
          icon={TEMPLATE_WIZARD_ICONS.buttons}
          title="Botões"
          description="Opcional — respostas rápidas ou link/telefone (não misture os dois tipos).">
          <div className="space-y-4">
            <TemplateOptionPicker
              value={formData.buttonMode}
              onChange={(id) => setFormData({ ...formData, buttonMode: id })}
              options={TEMPLATE_BUTTON_OPTIONS}
              ariaLabel="Tipo de botões"
              columns="3"
              disabled={!canCreate}
            />
            {formData.buttonMode === 'QUICK_REPLY' ? (
              <div className="space-y-3">
                {formData.quickReplies.map((text, idx) => (
                  <Input
                    key={idx}
                    label={`Opção ${idx + 1}${idx === 0 ? '' : ' (opcional)'}`}
                    value={text}
                    onChange={(e) =>
                      setFormData((f) => {
                        const next = [...f.quickReplies];
                        next[idx] = e.target.value;
                        return { ...f, quickReplies: next };
                      })
                    }
                    placeholder={idx === 0 ? 'Quero saber mais' : 'Não tenho interesse'}
                    maxLength={25}
                    disabled={!canCreate}
                  />
                ))}
                {formData.quickReplies.length < 3 ? (
                  <button
                    type="button"
                    disabled={!canCreate}
                    onClick={() => setFormData((f) => ({ ...f, quickReplies: [...f.quickReplies, ''] }))}
                    className="text-sm font-medium text-primary hover:underline">
                    + Terceira opção
                  </button>
                ) : null}
              </div>
            ) : null}
            {formData.buttonMode === 'CALL_TO_ACTION' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/80">
                  <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Abrir website</p>
                  <div className="space-y-3">
                    <Input
                      label="Texto no botão"
                      value={formData.urlButtonText}
                      onChange={(e) => setFormData({ ...formData, urlButtonText: e.target.value })}
                      placeholder="Ver oferta"
                      maxLength={25}
                      disabled={!canCreate}
                    />
                    <Input
                      label="URL"
                      value={formData.urlButtonUrl}
                      onChange={(e) => setFormData({ ...formData, urlButtonUrl: e.target.value })}
                      placeholder="https://loja.com/promo"
                      disabled={!canCreate}
                    />
                    {urlVariableCount > 0 ? (
                      <Input
                        label="Exemplo da variável na URL"
                        required
                        value={formData.urlButtonExample}
                        onChange={(e) => setFormData({ ...formData, urlButtonExample: e.target.value })}
                        placeholder="verao2026"
                        disabled={!canCreate}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-700/80">
                  <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Ligar (opcional)</p>
                  <div className="space-y-3">
                    <Input
                      label="Texto no botão"
                      value={formData.phoneButtonText}
                      onChange={(e) => setFormData({ ...formData, phoneButtonText: e.target.value })}
                      placeholder="Falar connosco"
                      maxLength={25}
                      disabled={!canCreate}
                    />
                    <Input
                      label="Telefone com indicativo"
                      value={formData.phoneButtonNumber}
                      onChange={(e) => setFormData({ ...formData, phoneButtonNumber: e.target.value })}
                      placeholder="+5511999999999"
                      disabled={!canCreate}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </WizardSection>
      ) : null}

      <div className="flex items-start gap-3 rounded-2xl border border-primary-a20 bg-gradient-to-br from-primary-a7 to-transparent p-4 dark:border-primary-a25 dark:from-primary-a10">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-base leading-normal text-slate-500">
          Revise o resumo. Se estiver tudo certo, clique em{' '}
          <strong className="text-slate-800 dark:text-white">Enviar para aprovação</strong>. A Meta pode levar até 24 h.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          <FlowWizardSummaryRow label="Nome" value={formData.name || '—'} />
          <FlowWizardSummaryRow label="Categoria" value={TEMPLATE_CATEGORY_LABELS[formData.category]} />
          {!isAuth ? (
            <FlowWizardSummaryRow label="Cabeçalho" value={TEMPLATE_HEADER_LABELS[formData.headerMode]} />
          ) : null}
          <FlowWizardSummaryRow label="Mensagem" value={bodyPreview} />
          {!isAuth && formData.footer.trim() ? (
            <FlowWizardSummaryRow label="Rodapé" value={footerPreview} />
          ) : null}
          {isAuth ? (
            <FlowWizardSummaryRow label="Botão OTP" value={formData.copyCodeText.trim() || 'Copiar código'} />
          ) : (
            <FlowWizardSummaryRow
              label="Botões"
              value={
                formData.buttonMode === 'QUICK_REPLY'
                  ? quickPreview
                  : formData.buttonMode === 'CALL_TO_ACTION'
                    ? ctaPreview
                    : TEMPLATE_BUTTON_LABELS.none
              }
            />
          )}
        </dl>
      </div>
    </div>
  );
};
