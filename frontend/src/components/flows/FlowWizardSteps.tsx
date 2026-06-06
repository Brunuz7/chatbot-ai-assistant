import React from 'react';
import { Sparkles } from 'lucide-react';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { FlowActionPicker } from './FlowActionPicker';
import { FlowWizardActionFields } from './FlowWizardActionFields';
import { FlowWizardSummaryRow } from './FlowWizardSummaryRow';
import { WizardSection } from './WizardSection';
import { FLOW_TYPE_LABELS, getFlowActionOption, WIZARD_SECTION_ICONS } from './flowWizardConstants';

export type FlowFormState = {
  name: string;
  agent_id: string;
  is_active: boolean;
  entry_instruction: string;
  priority: number;
  type: string;
  content: string;
  next_flow_id: string;
  metadata: Record<string, unknown>;
};

type FlowWizardStepsProps = {
  step: number;
  formData: FlowFormState;
  setFormData: React.Dispatch<React.SetStateAction<FlowFormState>>;
  agents: { id: string; name: string }[];
  siblingFlows: { id: string; name: string }[];
  currentFlowId: string | null;
  nextFlowName: string;
};

export const FlowWizardStep1: React.FC<FlowWizardStepsProps> = ({ formData, setFormData, agents }) => {
  return (
    <div className="animate-slide-in-right space-y-5">
      <WizardSection
        icon={WIZARD_SECTION_ICONS.basic}
        title="Informações básicas"
        description="Nome interno e quando a IA deve escolher este fluxo.">
        <div className="space-y-4">
          <Input
            label="Nome deste fluxo"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Boas-vindas"
          />
          <Select
            label="Agente (opcional)"
            value={formData.agent_id}
            onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}>
            <option value="">Nenhum — usar só instruções globais</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </WizardSection>

      <WizardSection
        icon={WIZARD_SECTION_ICONS.trigger}
        title="Quando este fluxo inicia"
        description="Descreva em linguagem natural em que situação a IA deve ativar este passo.">
        <TextArea
          label="Instrução de início"
          required
          value={formData.entry_instruction}
          onChange={(e) => setFormData({ ...formData, entry_instruction: e.target.value })}
          placeholder="Ex.: quando o cliente pedir orçamento, preço ou demonstração do produto."
          rows={4}
        />
      </WizardSection>
    </div>
  );
};

export const FlowWizardStep2: React.FC<FlowWizardStepsProps> = ({ formData, setFormData, siblingFlows }) => {
  const selected = getFlowActionOption(formData.type);
  const hasDetailFields =
    formData.type !== 'start' &&
    (formData.type === 'send_message' ||
      formData.type === 'message' ||
      formData.type === 'send_voice' ||
      formData.type === 'wait_reply' ||
      formData.type === 'goto' ||
      formData.type === 'interpret' ||
      formData.type === 'interpret_voice' ||
      formData.type === 'condition' ||
      formData.type === 'handover');

  return (
    <div className="animate-slide-in-right space-y-5">
      <WizardSection icon={WIZARD_SECTION_ICONS.action} title="O que acontece neste passo?">
        <FlowActionPicker value={formData.type} onChange={(id) => setFormData({ ...formData, type: id })} />
      </WizardSection>

      {hasDetailFields ? (
        <WizardSection icon={WIZARD_SECTION_ICONS.details} title="Detalhes desta ação" description={selected?.hint}>
          <div>
            <FlowWizardActionFields formData={formData} setFormData={setFormData} siblingFlows={siblingFlows} />
          </div>
        </WizardSection>
      ) : formData.type === 'start' ? (
        <WizardSection icon={WIZARD_SECTION_ICONS.details} title="Detalhes desta ação">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Este passo não envia mensagem. Escolha abaixo o próximo fluxo ou use a ação{' '}
            <strong className="font-medium text-slate-800 dark:text-white">Ir para fluxo</strong>.
          </p>
        </WizardSection>
      ) : null}

      {formData.type !== 'goto' ? (
        <WizardSection
          icon={WIZARD_SECTION_ICONS.next}
          title="Depois deste passo"
          description="Opcional: qual fluxo executar quando este terminar.">
          <Select
            label="Próximo fluxo"
            value={formData.next_flow_id}
            onChange={(e) => setFormData({ ...formData, next_flow_id: e.target.value })}>
            <option value="">Terminar aqui</option>
            {siblingFlows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </WizardSection>
      ) : null}
    </div>
  );
};

export const FlowWizardStep3: React.FC<FlowWizardStepsProps> = ({ formData, nextFlowName, currentFlowId, agents }) => {
  const action = getFlowActionOption(formData.type);
  const agentName = formData.agent_id ? (agents.find((a) => a.id === formData.agent_id)?.name ?? '—') : 'Nenhum';
  const ActionIcon = action?.icon;
  const entryPreview = formData.entry_instruction.trim() || '—';

  return (
    <div className="animate-slide-in-right space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary-a20 bg-gradient-to-br from-primary-a7 to-transparent p-4 dark:border-primary-a25 dark:from-primary-a10">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-base leading-normal text-slate-500">
          Revise o resumo. Se estiver tudo certo, clique em{' '}
          <strong className="text-slate-800 dark:text-white">Salvar fluxo</strong>.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          <FlowWizardSummaryRow label="Nome" value={formData.name || '—'} />
          <FlowWizardSummaryRow label="Quando inicia" value={entryPreview} />
          <FlowWizardSummaryRow label="Agente" value={agentName} />
          <FlowWizardSummaryRow
            label="Ação"
            value={FLOW_TYPE_LABELS[formData.type] || formData.type}
            icon={ActionIcon}
          />
          {formData.type === 'goto' && formData.next_flow_id ? (
            <FlowWizardSummaryRow label="Ir para" value={nextFlowName} />
          ) : formData.type !== 'goto' ? (
            <FlowWizardSummaryRow label="Próximo fluxo" value={nextFlowName} />
          ) : null}
          {currentFlowId ? (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
              <dt className="shrink-0 text-sm font-medium leading-normal text-slate-500">Estado</dt>
              <dd>
                <Badge variant={formData.is_active ? 'success' : 'danger'}>
                  {formData.is_active ? 'Ativo' : 'Pausado'}
                </Badge>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {action ? <p className="text-center text-sm leading-normal text-slate-500">{action.description}</p> : null}
    </div>
  );
};
