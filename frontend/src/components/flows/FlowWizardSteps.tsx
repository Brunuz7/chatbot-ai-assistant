import React, { useState } from 'react';
import { ChevronDown, Settings2, Sparkles } from 'lucide-react';
import { Input, Select, TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { FlowActionPicker } from './FlowActionPicker';
import { EntryModePicker } from './EntryModePicker';
import { ActionHintCard, WizardSection } from './WizardSection';
import {
  FLOW_TYPE_LABELS,
  getActionAccentStyles,
  getFlowActionOption,
  type FlowActionId,
} from './flowWizardConstants';

import type { FlowFormState } from '../../lib/flowForm';

type FlowWizardStepsProps = {
  step: number;
  formData: FlowFormState;
  setFormData: React.Dispatch<React.SetStateAction<FlowFormState>>;
  agents: { id: string; name: string }[];
  flowsForAgent: { id: string; name: string }[];
  currentFlowId: string | null;
  nextFlowName: string;
};

export const FlowWizardStep1: React.FC<FlowWizardStepsProps> = ({
  formData,
  setFormData,
  agents,
  currentFlowId,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="animate-in slide-in-from-right-4 space-y-5 duration-300">
      <WizardSection
        step={1}
        title="Informações básicas"
        description="Nome interno e agente responsável por este passo."
        active
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome deste fluxo"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex.: Boas-vindas"
            
          />
          <Select
            label="Agente"
            required
            value={formData.agent_id}
            onChange={(e) => setFormData({ ...formData, agent_id: e.target.value, next_flow_id: '' })}
            
          >
            <option value="" disabled>
              Selecione
            </option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </WizardSection>

      <WizardSection
        step={2}
        title="Quando este fluxo inicia"
        description="Escolha em que situação o WhatsApp deve executar este passo."
      >
        <EntryModePicker
          value={formData.entry_mode}
          onChange={(mode) => setFormData({ ...formData, entry_mode: mode })}
        />

        {formData.entry_mode === 'trigger' ? (
          <div className="mt-4">
            <TextArea
              label="Frases que ativam este fluxo"
              value={formData.intentsStr}
              onChange={(e) => setFormData({ ...formData, intentsStr: e.target.value })}
              placeholder={'quero falar com vendas\nproblema no pedido'}
              rows={3}
              
            />
            <p className="mt-2 type-muted">
              Uma frase por linha. O sistema procura estas palavras na mensagem do cliente.
            </p>
          </div>
        ) : null}
      </WizardSection>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-slate-800/40"
        >
          <span className="inline-flex items-center gap-2">
            <Settings2 size={16} className="text-slate-400" aria-hidden />
            Configurações avançadas
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {advancedOpen ? (
          <div className="space-y-3 border-t border-slate-200/80 px-4 pb-4 pt-3 dark:border-slate-800">
            <Input
              label="Ordem de execução"
              type="number"
              value={String(formData.priority)}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              
            />
            <p className="type-muted">
              Número mais alto tem preferência quando vários fluxos podem iniciar ao mesmo tempo.
            </p>
            {currentFlowId ? (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Fluxo ativo no WhatsApp</span>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const FlowWizardStep2: React.FC<FlowWizardStepsProps> = ({ formData, setFormData, flowsForAgent }) => {
  const selected = getFlowActionOption(formData.type);
  const accent = selected ? getActionAccentStyles(selected.accent) : getActionAccentStyles('slate');
  const SelectedIcon = selected?.icon;
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
    <div className="animate-in slide-in-from-right-4 space-y-5 duration-300">
      <WizardSection step={1} title="O que acontece neste passo?" active>
        <FlowActionPicker
          value={formData.type}
          onChange={(id) => setFormData({ ...formData, type: id })}
        />
      </WizardSection>

      {hasDetailFields ? (
        <WizardSection
          step={2}
          title="Detalhes desta ação"
          description={selected?.hint}
        >
          <div >{renderActionFields(formData, setFormData, flowsForAgent)}</div>
        </WizardSection>
      ) : formData.type === 'start' ? (
        <WizardSection step={2} title="Detalhes desta ação">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Este passo não envia mensagem — apenas prepara a conversa para seguir à próxima etapa que você
            escolher abaixo.
          </p>
        </WizardSection>
      ) : null}

      {formData.type !== 'goto' && formData.type !== 'start' ? (
        <WizardSection
          step={hasDetailFields || formData.type === 'start' ? 3 : 2}
          title="Depois deste passo"
          description="Opcional: qual fluxo executar quando este terminar."
        >
          <Select
            label="Próxima etapa"
            value={formData.next_flow_id}
            onChange={(e) => setFormData({ ...formData, next_flow_id: e.target.value })}
            
          >
            <option value="">Terminar aqui</option>
            {flowsForAgent.map((f) => (
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

function renderActionFields(
  formData: FlowFormState,
  setFormData: React.Dispatch<React.SetStateAction<FlowFormState>>,
  flowsForAgent: { id: string; name: string }[],
) {
  const setMeta = (patch: Record<string, unknown>) =>
    setFormData({ ...formData, metadata: { ...formData.metadata, ...patch } });

  switch (formData.type as FlowActionId) {
    case 'send_message':
    case 'message':
      return (
        <TextArea
          label="Texto da mensagem"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Olá! Como podemos ajudar?"
          rows={3}
          
        />
      );
    case 'send_voice':
      return (
        <div className="space-y-2">
          <TextArea
            label="Texto que será lido em voz"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Olá! Como podemos ajudar?"
            rows={3}
            
          />
          <p className="type-muted">
            A voz usada está em <strong className="font-medium">Configurações → Resposta em áudio</strong>.
          </p>
        </div>
      );
    case 'wait_reply':
      return (
        <TextArea
          label="Mensagem enquanto espera (opcional)"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Ex.: Pode responder quando quiser."
          rows={2}
          
        />
      );
    case 'goto':
      return (
        <Select
          label="Qual etapa seguir"
          value={String(formData.metadata.target_flow_id ?? formData.next_flow_id ?? '')}
          onChange={(e) => {
            const id = e.target.value;
            setFormData({
              ...formData,
              next_flow_id: id,
              metadata: { ...formData.metadata, target_flow_id: id },
            });
          }}
          
        >
          <option value="">Escolha a etapa…</option>
          {flowsForAgent.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      );
    case 'interpret':
    case 'interpret_voice':
      return (
        <div className="space-y-2">
          <TextArea
            label="O que a IA deve fazer aqui"
            value={String(formData.metadata.extract_instruction ?? '')}
            onChange={(e) => setMeta({ extract_instruction: e.target.value })}
            placeholder="Ex.: seja simpático e peça o número do pedido."
            rows={3}
            
          />
          {formData.type === 'interpret_voice' ? (
            <p className="type-muted">
              A resposta será enviada em áudio. Configure a voz em{' '}
              <strong className="font-medium">Configurações → Resposta em áudio</strong>.
            </p>
          ) : null}
        </div>
      );
    case 'condition':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Se a mensagem do cliente…"
            value={String(formData.metadata.operator ?? 'contains')}
            onChange={(e) => setMeta({ operator: e.target.value })}
            
          >
            <option value="contains">Contiver o texto</option>
            <option value="equals">For igual ao texto</option>
          </Select>
          <Input
            label="Texto"
            value={String(formData.metadata.value ?? '')}
            onChange={(e) => setMeta({ value: e.target.value })}
            placeholder="ex.: sim"
            
          />
          <Select
            label="Então ir para"
            value={String(formData.metadata.true_flow_id ?? '')}
            onChange={(e) => setMeta({ true_flow_id: e.target.value })}
            
          >
            <option value="">—</option>
            {flowsForAgent.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select
            label="Senão, ir para"
            value={String(formData.metadata.false_flow_id ?? '')}
            onChange={(e) => setMeta({ false_flow_id: e.target.value })}
            
          >
            <option value="">—</option>
            {flowsForAgent.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
      );
    case 'handover':
      return (
        <TextArea
          label="Mensagem para o cliente"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Um atendente vai continuar a conversa em breve."
          rows={2}
          
        />
      );
    default:
      return null;
  }
}

export const FlowWizardStep3: React.FC<FlowWizardStepsProps> = ({
  formData,
  nextFlowName,
  currentFlowId,
  agents,
}) => {
  const action = getFlowActionOption(formData.type);
  const agentName = agents.find((a) => a.id === formData.agent_id)?.name ?? '—';
  const ActionIcon = action?.icon;

  return (
    <div className="animate-in slide-in-from-right-4 space-y-5 duration-300">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent p-4 dark:border-primary/25 dark:from-primary/10">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="type-body">
          Revise o resumo. Se estiver tudo certo, clique em{' '}
          <strong className="text-slate-800 dark:text-white">Salvar fluxo</strong>.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          <SummaryRow label="Nome" value={formData.name || '—'} />
          <SummaryRow label="Agente" value={agentName} />
          <SummaryRow
            label="Quando inicia"
            value={formData.entry_mode === 'trigger' ? 'Por frases do cliente' : 'Em qualquer mensagem'}
          />
          <SummaryRow label="Ação" value={FLOW_TYPE_LABELS[formData.type] || formData.type} icon={ActionIcon} />
          <SummaryRow label="Próxima etapa" value={nextFlowName} />
          {currentFlowId ? (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
              <dt className="type-muted font-medium">Estado</dt>
              <dd>
                <Badge variant={formData.is_active ? 'success' : 'danger'}>
                  {formData.is_active ? 'Ativo' : 'Pausado'}
                </Badge>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {action ? (
        <p className="text-center type-muted">{action.description}</p>
      ) : null}
    </div>
  );
};

function SummaryRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
      <dt className="type-muted font-medium">{label}</dt>
      <dd className="type-body flex items-center gap-2 font-medium sm:text-right">
        {Icon ? <Icon size={16} className="shrink-0 text-primary" aria-hidden /> : null}
        {value}
      </dd>
    </div>
  );
}

