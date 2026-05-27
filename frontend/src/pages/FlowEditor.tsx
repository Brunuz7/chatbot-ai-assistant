import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { FlowWizardStep1, FlowWizardStep2, FlowWizardStep3 } from '../components/flows/FlowWizardSteps';
import {
  ArrowLeft,
  Check,
  ArrowRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import {
  EMPTY_FLOW_FORM,
  type FlowFormState,
  type FlowRecord,
  flowToFormState,
  formStateToPayload,
} from '../lib/flowForm';
import { FLOATING_ACTION_SCROLL_CLEARANCE } from '../lib/floatingActionLayout';

const STEP_HINTS: Record<number, string> = {
  1: 'Nome e instrução para a IA escolher este fluxo.',
  2: 'O que o chatbot faz e para onde segue.',
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
        const [flowsRes, agentsRes] = await Promise.all([
          api.get<FlowRecord[]>('/api/flows'),
          api.get<{ id: string; name: string }[]>('/api/agents'),
        ]);

        if (cancelled) return;

        const flowList = Array.isArray(flowsRes.data) ? flowsRes.data : [];
        const agentList = Array.isArray(agentsRes.data) ? agentsRes.data : [];
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
        } else {
          setFormData(EMPTY_FLOW_FORM);
        }
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

  const siblingFlows = useMemo(
    () => flows.filter((f) => f.id !== flowId),
    [flows, flowId],
  );

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

  const canContinueStep1 =
    formData.name.trim().length > 0 && formData.entry_instruction.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = formStateToPayload(formData, isEdit);
      if (isEdit && flowId) {
        await api.put(`/api/flows/${flowId}`, payload);
        toast.success('Fluxo atualizado.');
      } else {
        await api.post('/api/flows', payload);
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
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="type-body">A carregar editor…</p>
        </div>
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
              aria-label="Voltar aos fluxos"
            >
              <ArrowLeft size={18} aria-hidden />
              Voltar
            </Button>
          }
        />

        <div className={`w-full flex-1 pt-4 md:pt-5 ${FLOATING_ACTION_SCROLL_CLEARANCE}`}>
          {activeStep === 1 && <FlowWizardStep1 {...wizardProps} />}
          {activeStep === 2 && <FlowWizardStep2 {...wizardProps} />}
          {activeStep === 3 && <FlowWizardStep3 {...wizardProps} />}
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-3 z-40 transition-[left] duration-300 md:bottom-4"
        style={{ left: 'var(--layout-sidebar-width, 0px)', right: 0 }}
      >
        <div className="mx-auto flex max-w-7xl justify-center px-4 md:px-6">
        {activeStep < 3 ? (
          <Button
            type="button"
            size="md"
            className="pointer-events-auto min-w-[9.5rem] rounded-full bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
            onClick={() => setActiveStep((s) => s + 1)}
            disabled={activeStep === 1 && !canContinueStep1}
          >
            Próximo passo
            <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            size="md"
            className="pointer-events-auto min-w-[9.5rem] rounded-full bg-primary px-5 py-2.5 text-sm text-white shadow-none enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover"
            onClick={() => void handleSave()}
            disabled={saving || !canContinueStep1}
          >
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
