import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { PageShellSkeleton } from '../components/ui/Skeleton';
import { FlowWizardStep1, FlowWizardStep2, FlowWizardStep3 } from '../components/flows/FlowWizardSteps';
import { ArrowLeft, Check, ArrowRight, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { flowService, type FlowRecord } from '../services/FlowService';
import { agentService } from '../services/AgentService';
import { getApiErrorMessage } from '../utils/apiError';
import type { FlowFormState } from '../components/flows/FlowWizardSteps';

const EMPTY_FLOW_FORM: FlowFormState = {
  name: '',
  agent_id: '',
  is_active: true,
  entry_instruction: '',
  priority: 0,
  type: 'send_message',
  content: '',
  next_flow_id: '',
  metadata: {},
};

function flowTypeFromLegacy(flow: FlowRecord): string {
  if (flow.type) return flow.type;
  const first = flow.steps?.[0];
  if (!first) return 'interpret';
  if (first.type === 'interactive_buttons') return 'send_message';
  if (first.type === 'set_state') return 'goto';
  return first.type;
}

function legacyEntryInstruction(flow: FlowRecord): string {
  const explicit = String(flow.entry_instruction ?? '').trim();
  if (explicit) return explicit;

  const intents = flow.trigger_intents;
  if (Array.isArray(intents) && intents.length)
    return `Iniciar quando o cliente mencionar ou demonstrar: ${intents.map(String).join('; ')}.`;

  const kw = flow.trigger_keywords;
  if (Array.isArray(kw) && kw.length) return `Iniciar quando a mensagem contiver: ${kw.map(String).join(', ')}.`;

  if (flow.entry_mode === 'always_idle')
    return 'Iniciar quando nenhum outro fluxo específico se aplicar (fallback geral).';

  return '';
}

function flowToFormState(flow: FlowRecord): FlowFormState {
  const first = flow.steps?.[0];
  const meta = { ...(flow.metadata || {}), ...(first?.metadata || {}) } as Record<string, unknown>;
  let type = flowTypeFromLegacy(flow);
  let content = flow.content ?? first?.content ?? '';
  let next_flow_id = flow.next_flow_id ?? '';

  if (first?.type === 'interactive_buttons') {
    const title = (meta.title as string) || content || 'Escolha uma opção';
    const buttons = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
    const lines = buttons.map((b) => `• ${String(b.displayText || b.id || '').trim()}`).filter((l) => l.length > 2);
    content = lines.length > 0 ? `${title}\n\n${lines.join('\n')}` : title;
    meta.buttons = undefined;
    meta.title = undefined;
  }

  if (first?.type === 'set_state' || type === 'goto') {
    type = 'goto';
    const target = String(meta.target_flow_id ?? meta.target_step ?? first?.next_step ?? '').trim();
    if (target) next_flow_id = target;
  }

  if (meta.true_step && !meta.true_flow_id) meta.true_flow_id = meta.true_step;
  if (meta.false_step && !meta.false_flow_id) meta.false_flow_id = meta.false_step;
  if (meta.target_step && !meta.target_flow_id) meta.target_flow_id = meta.target_step;

  return {
    name: flow.name,
    agent_id: flow.agent_id ?? '',
    is_active: flow.is_active,
    entry_instruction: legacyEntryInstruction(flow),
    priority: flow.priority ?? 0,
    type,
    content,
    next_flow_id,
    metadata: meta,
  };
}

function formStateToPayload(formData: FlowFormState, isEdit: boolean) {
  return {
    name: formData.name,
    agent_id: formData.agent_id.trim() || null,
    is_active: isEdit ? formData.is_active : true,
    entry_mode: 'instruction',
    entry_instruction: formData.entry_instruction.trim(),
    priority: Number(formData.priority) || 0,
    trigger_keywords: [],
    trigger_intents: [],
    entry_events: [],
    type: formData.type,
    content: formData.content || null,
    next_flow_id:
      formData.type === 'goto'
        ? formData.next_flow_id.trim() || String(formData.metadata.target_flow_id ?? '').trim() || null
        : formData.next_flow_id.trim() || null,
    metadata: formData.metadata,
  };
}

const STEP_HINTS: Record<number, string> = {
  1: 'Nome e instrução do fluxo.',
  2: 'Acção do chatbot e próximo passo.',
  3: 'Revise antes de salvar.',
};

const FlowEditor: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(flowId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<FlowFormState>(EMPTY_FLOW_FORM);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [flowList, agentList] = await Promise.all([flowService.list(), agentService.listSummaries()]);

        if (cancelled) return;
        setFlows(flowList);
        setAgents(agentList);

        if (isEdit && flowId) {
          const flow = flowList.find((f) => f.id === flowId);
          if (!flow) {
            toast.error('Fluxo não encontrado.');
            navigate('/fluxos', { replace: true });
            return;
          }
          setFormData(flowToFormState(flow));
        } else setFormData(EMPTY_FLOW_FORM);
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, 'Não foi possível carregar os dados.'));
        navigate('/fluxos', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [flowId, isEdit, navigate]);

  const siblingFlows = useMemo(() => flows.filter((f) => f.id !== flowId), [flows, flowId]);

  const nextFlowName = formData.next_flow_id
    ? flows.find((f) => f.id === formData.next_flow_id)?.name || 'Etapa não encontrada'
    : 'Terminar aqui';

  const wizardProps = {
    step: activeStep,
    formData,
    setFormData,
    agents,
    siblingFlows,
    currentFlowId: flowId ?? null,
    nextFlowName,
  };

  const canContinueStep1 = formData.name.trim().length > 0 && formData.entry_instruction.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = formStateToPayload(formData, isEdit);
      if (isEdit && flowId) {
        await flowService.update(flowId, payload);
        toast.success('Fluxo atualizado.');
      } else {
        await flowService.create(payload);
        toast.success('Fluxo criado.');
      }
      navigate('/fluxos');
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o fluxo.'));
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
          icon={Zap}
          title={isEdit ? 'Editar fluxo' : 'Novo fluxo'}
          subtitle={STEP_HINTS[activeStep]}
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/fluxos')}
              className="w-full gap-2 sm:w-auto"
              aria-label="Voltar aos fluxos">
              <ArrowLeft size={18} aria-hidden />
              Voltar
            </Button>
          }
        />

        <div className="w-full flex-1 pt-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+2.5rem)] md:pt-5 sm:pb-[calc(1rem+2.5rem)]">
          {activeStep === 1 && <FlowWizardStep1 {...wizardProps} />}
          {activeStep === 2 && <FlowWizardStep2 {...wizardProps} />}
          {activeStep === 3 && <FlowWizardStep3 {...wizardProps} />}
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-3 z-40 transition-[left] duration-300 md:bottom-4"
        style={{ left: 'var(--layout-sidebar-width, 0px)', right: 0 }}>
        <div className="mx-auto flex max-w-7xl justify-center px-4 md:px-6">
          {activeStep < 3 ? (
            <Button
              type="button"
              size="md"
              className="pointer-events-auto min-w-[9.5rem] rounded-lg bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
              onClick={() => setActiveStep((s) => s + 1)}
              disabled={activeStep === 1 && !canContinueStep1}>
              Próximo passo
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              size="md"
              className="pointer-events-auto min-w-[9.5rem] rounded-lg bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
              onClick={() => void handleSave()}
              disabled={saving || !canContinueStep1}>
              <Check size={18} strokeWidth={2.25} aria-hidden />
              {saving ? 'Salvando…' : 'Salvar fluxo'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FlowEditor;
