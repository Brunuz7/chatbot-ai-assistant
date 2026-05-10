import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DataList } from '../components/ui/DataList';
import { FilterBar } from '../components/ui/FilterBar';
import { Stepper } from '../components/ui/Stepper';
import { Input, Select, TextArea } from '../components/ui/Input';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  MessageSquare,
  Type,
  Split,
  Brain,
  UserCheck,
  Rocket,
  ClipboardList,
  ListTodo,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';

interface FlowStep {
  key: string;
  type: string;
  content: string;
  next_step: string;
  metadata: Record<string, unknown>;
}

interface Flow {
  id: string;
  name: string;
  agent_id: string;
  is_active: boolean;
  entry_mode?: string;
  entry_step_key?: string | null;
  priority?: number;
  trigger_keywords?: unknown;
  trigger_intents?: unknown;
  entry_events?: unknown;
  steps: FlowStep[];
  agent?: { name: string };
}

function parseTriggerList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function triggerArrayToString(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return v.filter((x) => typeof x === 'string').join(', ');
}

/** Converte etapa legada de botões em mensagem de texto (backend já não usa botões nativos). */
function migrateInteractiveButtonsStep(s: FlowStep): FlowStep {
  if (s.type !== 'interactive_buttons') return s;
  const meta = (s.metadata || {}) as Record<string, unknown>;
  const title = (meta.title as string) || s.content || 'Escolha uma opção';
  const buttons = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
  const lines = buttons.map((b) => `• ${String(b.displayText || b.id || '').trim()}`).filter((l) => l.length > 2);
  const body =
    lines.length > 0
      ? `${title}\n\n${lines.join('\n')}\n\nResponda com o texto da opção ou envie outra mensagem.`
      : title;
  return { ...s, type: 'send_message', content: body.trim(), metadata: {} };
}

/** Etapa legada `set_state`: o motor não grava mais contexto; vira `goto` para a antiga próxima etapa. */
function migrateSetStateStep(s: FlowStep): FlowStep {
  if (s.type !== 'set_state') return s;
  const next = (s.next_step || '').trim();
  const meta = { ...(s.metadata || {}) } as Record<string, unknown>;
  if (next) meta.target_step = next;
  return { ...s, type: 'goto', metadata: meta, next_step: '', content: s.content || '' };
}

function migrateFlowStep(s: FlowStep): FlowStep {
  return migrateSetStateStep(migrateInteractiveButtonsStep(s));
}

function normalizeStepsForApi(steps: FlowStep[]): FlowStep[] {
  return steps.map((step) => migrateFlowStep(step));
}

const Automations: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [activeWizardStep, setActiveWizardStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    agent_id: '',
    is_active: true,
    entry_mode: 'trigger',
    entry_step_key: '',
    priority: 0,
    intentsStr: '',
    steps: [] as FlowStep[],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  const fetchData = async () => {
    try {
      const [flowsRes, agentsRes] = await Promise.all([api.get('/api/flows'), api.get('/api/agents')]);
      setFlows(flowsRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível carregar roteiros e agentes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (flow?: Flow) => {
    setActiveWizardStep(1);
    if (flow) {
      setCurrentFlowId(flow.id);
      const steps: FlowStep[] = (flow.steps || []).map((s) =>
        migrateFlowStep({ ...s, metadata: (s.metadata || {}) as Record<string, unknown> }),
      );
      setFormData({
        name: flow.name,
        agent_id: flow.agent_id,
        is_active: flow.is_active,
        entry_mode: flow.entry_mode || 'always_idle',
        entry_step_key: flow.entry_step_key || '',
        priority: flow.priority ?? 0,
        intentsStr: triggerArrayToString(flow.trigger_intents),
        steps,
      });
    } else {
      setCurrentFlowId(null);
      setFormData({
        name: '',
        agent_id: agents.length > 0 ? agents[0].id : '',
        is_active: true,
        entry_mode: 'trigger',
        entry_step_key: '',
        priority: 0,
        intentsStr: '',
        steps: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este fluxo?')) return;
    try {
      await api.delete(`/api/flows/${id}`);
      toast.success('Roteiro eliminado.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível eliminar o roteiro.'));
    }
  };

  const handleToggleStatus = async (flow: Flow) => {
    try {
      await api.put(`/api/flows/${flow.id}`, { is_active: !flow.is_active });
      toast.success(flow.is_active ? 'Roteiro pausado.' : 'Roteiro ativado.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar o estado do roteiro.'));
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        agent_id: formData.agent_id,
        is_active: currentFlowId ? formData.is_active : true,
        entry_mode: formData.entry_mode,
        entry_step_key: formData.entry_step_key.trim() || null,
        priority: Number(formData.priority) || 0,
        trigger_keywords: [],
        trigger_intents:
          formData.entry_mode === 'trigger' ? parseTriggerList(formData.intentsStr) : [],
        entry_events: [],
        steps: normalizeStepsForApi(formData.steps),
      };
      if (currentFlowId) {
        await api.put(`/api/flows/${currentFlowId}`, payload);
      } else {
        await api.post(`/api/agents/${formData.agent_id}/flows`, payload);
      }
      setIsModalOpen(false);
      fetchData();
      toast.success(currentFlowId ? 'Roteiro atualizado.' : 'Roteiro criado.');
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível guardar o roteiro.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          key: `passo_${formData.steps.length + 1}`,
          type: 'send_message',
          content: '',
          next_step: '',
          metadata: {},
        },
      ],
    });
  };

  const handleUpdateStep = (index: number, patch: Partial<FlowStep>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...patch };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const filteredFlows = flows.filter((flow) => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = agentFilter === '' || flow.agent_id === agentFilter;
    return matchesSearch && matchesAgent;
  });

  const wizardSteps = useMemo(
    () => [
      { id: 1, title: 'Nome e disparo', description: 'Quando o WhatsApp usa este fluxo', icon: ClipboardList },
      { id: 2, title: 'Mensagens', description: 'O que o cliente recebe, em ordem', icon: ListTodo },
      { id: 3, title: 'Concluir', description: 'Rever e guardar', icon: Rocket },
    ],
    [],
  );

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'send_message':
      case 'message':
        return <MessageSquare size={18} />;
      case 'wait_reply':
      case 'input':
        return <Type size={18} />;
      case 'condition':
        return <Split size={18} />;
      case 'interpret':
      case 'ai':
        return <Brain size={18} />;
      case 'handover':
        return <UserCheck size={18} />;
      default:
        return <Zap size={18} />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'send_message':
      case 'message':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'wait_reply':
      case 'input':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
      case 'condition':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'interpret':
      case 'ai':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'handover':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={Zap}
          title="Fluxos de conversa"
          subtitle="Roteiros no WhatsApp (Evolution): mensagens guiadas e IA quando não há fluxo ativo."
          actions={
            <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto">
              <Plus size={20} /> Novo fluxo
            </Button>
          }
        />

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar fluxos..."
          activeFiltersCount={agentFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setAgentFilter('');
          }}
        >
          <div className="w-full">
            <Select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="">Todos os agentes</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>
        </FilterBar>

        <DataList
          data={filteredFlows}
          isLoading={loading}
          columns={[
            { header: 'Nome', accessor: 'name', className: 'font-bold text-slate-900 dark:text-white' },
            {
              header: 'Agente',
              accessor: (flow) => <Badge variant="default">{flow.agent?.name || 'Desconhecido'}</Badge>,
            },
            {
              header: 'Modo',
              accessor: (flow) => (
                <Badge variant="outline">{flow.entry_mode === 'trigger' ? 'Gatilhos' : 'Qualquer mensagem (idle)'}</Badge>
              ),
            },
            { header: 'Etapas', accessor: (flow) => `${flow.steps?.length || 0}` },
            {
              header: 'Status',
              accessor: (flow) => (
                <Badge variant={flow.is_active ? 'success' : 'danger'}>{flow.is_active ? 'Ativo' : 'Pausado'}</Badge>
              ),
            },
            {
              header: 'Ações',
              accessor: (flow) => (
                <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(flow)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleStatus(flow)}>
                    {flow.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:border-red-200"
                    onClick={() => handleDelete(flow.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
              className: 'text-right',
            },
          ]}
          renderCard={(flow) => (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all h-full flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{flow.name}</h3>
                  <Badge variant="default" className="mt-1">
                    {flow.agent?.name || 'Desconhecido'}
                  </Badge>
                </div>
                <Badge variant={flow.is_active ? 'success' : 'danger'}>{flow.is_active ? 'Ativo' : 'Pausado'}</Badge>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">{flow.steps?.length || 0} etapas</p>
                <Badge variant="outline">{flow.entry_mode === 'trigger' ? 'Com gatilhos' : 'Sempre quando idle'}</Badge>
              </div>
              <div
                className="flex gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(flow)}>
                  <Edit2 size={14} className="mr-2" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleToggleStatus(flow)}>
                  {flow.is_active ? <Pause size={14} className="mr-2" /> : <Play size={14} className="mr-2" />}
                  {flow.is_active ? 'Pausar' : 'Ativar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:border-red-200"
                  onClick={() => handleDelete(flow.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
          emptyState={
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full w-fit mx-auto shadow-sm mb-4">
                <Zap size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum fluxo criado</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
                Monte um fluxo em poucos passos e publique no WhatsApp.
              </p>
              <Button onClick={() => handleOpenModal()}>Criar primeiro fluxo</Button>
            </div>
          }
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentFlowId ? 'Editar fluxo' : 'Novo fluxo'}
        subtitle={
          currentFlowId
            ? 'Altere disparos, etapas e guarde quando estiver pronto.'
            : 'Três passos: informação do roteiro, mensagens e confirmação.'
        }
        maxWidth="full"
        headerAddon={<Stepper compact steps={wizardSteps} currentStep={activeWizardStep} />}
        footer={
          <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full shrink-0 sm:h-auto sm:w-auto"
              onClick={() => (activeWizardStep === 1 ? handleCloseModal() : setActiveWizardStep((s) => s - 1))}
            >
              {activeWizardStep === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
              {activeWizardStep < 3 ? (
                <Button
                  type="button"
                  className="h-11 w-full sm:h-auto sm:min-w-[9.5rem]"
                  onClick={() => setActiveWizardStep((s) => s + 1)}
                  disabled={activeWizardStep === 1 && (!formData.name.trim() || !formData.agent_id)}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full gap-2 sm:h-auto sm:min-w-[11rem]"
                  onClick={() => handleSubmit()}
                  disabled={saving || !formData.name.trim() || !formData.agent_id}
                >
                  <Rocket size={18} aria-hidden />
                  {saving ? 'Salvando…' : 'Guardar fluxo'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
          {activeWizardStep === 1 && (
            <div className="animate-in slide-in-from-right-4 space-y-4 duration-300 sm:space-y-5">
              <div className="flex gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.06] p-3.5 text-xs leading-relaxed text-slate-600 dark:border-primary/25 dark:bg-primary/10 dark:text-slate-300 sm:gap-3 sm:p-4 sm:text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px]" aria-hidden />
                <p>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Quando este roteiro entra.</span>{' '}
                  Com gatilhos, uma frase na mensagem do cliente escolhe este fluxo. Sem gatilhos, pode correr quando não
                  há outro roteiro ativo. A conversa segue a ordem que definir no passo seguinte.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Input
                  label="Nome deste roteiro (para o painel)"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex.: Boas-vindas"
                />
                <Select
                  label="Agente"
                  required
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Quando usar este roteiro?"
                  value={formData.entry_mode}
                  onChange={(e) => setFormData({ ...formData, entry_mode: e.target.value })}
                >
                  <option value="trigger">Só com as frases abaixo</option>
                  <option value="always_idle">Qualquer mensagem (sem outro roteiro ativo)</option>
                </Select>
                <Input
                  label="Prioridade (se houver empate, ganha o número mais alto)"
                  type="number"
                  value={String(formData.priority)}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                />
              </div>
              {formData.entry_mode === 'trigger' && (
                <TextArea
                  label="Frases que disparam este roteiro (uma por linha ou vírgulas)"
                  value={formData.intentsStr}
                  onChange={(e) => setFormData({ ...formData, intentsStr: e.target.value })}
                  placeholder={'Ex.: quero falar com vendas\nproblema no meu pedido'}
                  rows={3}
                />
              )}
            </div>
          )}

          {activeWizardStep === 2 && (
            <div className="animate-in slide-in-from-right-4 space-y-4 duration-300">
              <div className="flex gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/90 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 sm:p-4 sm:text-sm">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px]" aria-hidden />
                <p>
                  Cada bloco é um <strong className="text-slate-800 dark:text-slate-100">passo</strong>. Use um{' '}
                  <strong className="text-slate-800 dark:text-slate-100">nome curto sem espaços</strong> e{' '}
                  <strong className="text-slate-800 dark:text-slate-100">«A seguir vai para»</strong> para encadear. O
                  primeiro da lista é o que o cliente ouve primeiro.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-slate-800 dark:text-white sm:text-lg">Passos da conversa</h4>
                  {formData.steps.length > 0 ? (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {formData.steps.length} {formData.steps.length === 1 ? 'etapa' : 'etapas'}
                    </Badge>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep} className="h-10 w-full gap-2 sm:w-auto">
                  <Plus size={16} aria-hidden /> Adicionar etapa
                </Button>
              </div>

              <div className="space-y-3 pr-0.5 sm:space-y-4 sm:pr-1">
                {formData.steps.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 py-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                    <p className="px-4 text-sm text-slate-500 dark:text-slate-400">
                      Comece por <strong className="text-slate-700 dark:text-slate-200">Adicionar etapa</strong>, tipo{' '}
                      <strong className="text-slate-700 dark:text-slate-200">Mensagem</strong>, e ligue o próximo passo em{' '}
                      <strong className="text-slate-700 dark:text-slate-200">«A seguir vai para»</strong>.
                    </p>
                    <Button variant="ghost" size="sm" className="mt-4" onClick={handleAddStep}>
                      Adicionar primeira etapa
                    </Button>
                  </div>
                ) : (
                  formData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="group relative rounded-2xl border border-slate-200 bg-white p-3.5 transition-all hover:border-primary/35 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
                    >
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${getStepColor(step.type)}`}>{getStepIcon(step.type)}</div>
                          <div className="min-w-0">
                            <input
                              className="bg-transparent font-semibold outline-none border-b border-transparent focus:border-primary text-slate-900 dark:text-white px-0 py-0 text-sm w-full max-w-[220px]"
                              value={step.key}
                              onChange={(e) => handleUpdateStep(index, { key: e.target.value })}
                              placeholder="ex.: boas_vindas"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Nome deste passo (sem espaços), para o menu ao lado saber para onde saltar.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0"
                          aria-label="Remover etapa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <Select
                          label="Tipo"
                          value={step.type}
                          onChange={(e) => {
                            handleUpdateStep(index, { type: e.target.value });
                          }}
                        >
                          <option value="send_message">Mensagem</option>
                          <option value="wait_reply">Aguardar resposta</option>
                          <option value="goto">Ir para etapa</option>
                          <option value="interpret">Resposta com IA</option>
                          <option value="condition">Condição</option>
                          <option value="handover">Humano</option>
                          <option value="start">Início (marco)</option>
                        </Select>
                        <Select
                          label="A seguir vai para"
                          value={step.next_step || ''}
                          onChange={(e) => handleUpdateStep(index, { next_step: e.target.value })}
                        >
                          <option value="">— (último passo ou o sistema decide)</option>
                          {formData.steps
                            .filter((_, i) => i !== index)
                            .map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.key}
                              </option>
                            ))}
                        </Select>
                      </div>

                      {(step.type === 'send_message' || step.type === 'message') && (
                        <TextArea
                          label="Texto"
                          value={step.content || ''}
                          onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                          placeholder="Olá! Como podemos ajudar?"
                          rows={2}
                        />
                      )}

                      {step.type === 'wait_reply' && (
                        <TextArea
                          label="O que perguntar ao cliente (opcional)"
                          value={step.content || ''}
                          onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                          rows={2}
                        />
                      )}

                      {step.type === 'goto' && (
                        <Select
                          label="Saltar diretamente para o passo"
                          value={(step.metadata.target_step as string) || ''}
                          onChange={(e) =>
                            handleUpdateStep(index, { metadata: { ...step.metadata, target_step: e.target.value } })
                          }
                        >
                          <option value="">Escolha o passo…</option>
                          {formData.steps.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.key}
                            </option>
                          ))}
                        </Select>
                      )}

                      {step.type === 'interpret' && (
                        <TextArea
                          label="O que a inteligência artificial deve fazer neste ponto"
                          value={(step.metadata.extract_instruction as string) || ''}
                          onChange={(e) =>
                            handleUpdateStep(index, { metadata: { ...step.metadata, extract_instruction: e.target.value } })
                          }
                          placeholder="Ex.: responda de forma simpática e peça o número do pedido."
                          rows={2}
                        />
                      )}

                      {step.type === 'condition' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <Select
                            label="Comparar a mensagem do cliente se…"
                            value={(step.metadata.operator as string) || 'contains'}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, operator: e.target.value } })
                            }
                          >
                            <option value="contains">Contiver o texto abaixo</option>
                            <option value="equals">For exatamente igual ao texto abaixo</option>
                          </Select>
                          <Input
                            label="Texto a comparar (ignora maiúsculas)"
                            value={String(step.metadata.value ?? '')}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, value: e.target.value } })
                            }
                            placeholder="ex.: sim, cancelar"
                          />
                          <div className="md:col-span-2 grid grid-cols-2 gap-2">
                            <Select
                              label="Se bater, ir para o passo"
                              value={(step.metadata.true_step as string) || ''}
                              onChange={(e) =>
                                handleUpdateStep(index, { metadata: { ...step.metadata, true_step: e.target.value } })
                              }
                            >
                              <option value="">—</option>
                              {formData.steps.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.key}
                                </option>
                              ))}
                            </Select>
                            <Select
                              label="Se não bater, ir para o passo"
                              value={(step.metadata.false_step as string) || ''}
                              onChange={(e) =>
                                handleUpdateStep(index, { metadata: { ...step.metadata, false_step: e.target.value } })
                              }
                            >
                              <option value="">—</option>
                              {formData.steps.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.key}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      )}

                      {step.type === 'handover' && (
                        <TextArea
                          label="Mensagem ao cliente"
                          value={step.content || ''}
                          onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                          rows={2}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div className="animate-in slide-in-from-right-4 space-y-4 duration-300">
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Confira e use <strong className="text-slate-700 dark:text-slate-200">Guardar fluxo</strong> abaixo. A
                sequência de chaves reflete a ordem da lista e os saltos em «A seguir vai para».
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80">
                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3.5">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Nome
                    </dt>
                    <dd className="min-w-0 font-semibold text-slate-900 dark:text-white sm:text-right">
                      {formData.name || '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3.5">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Agente
                    </dt>
                    <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-100 sm:text-right">
                      {agents.find((a) => a.id === formData.agent_id)?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3.5">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Disparo
                    </dt>
                    <dd className="min-w-0 text-right text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">
                      {formData.entry_mode === 'trigger'
                        ? 'Por frases (gatilhos)'
                        : 'Qualquer mensagem (sem outro roteiro ativo)'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3.5">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Etapas
                    </dt>
                    <dd className="font-semibold tabular-nums text-slate-900 dark:text-white sm:text-right">
                      {formData.steps.length}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-3.5">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Estado
                    </dt>
                    <dd className="sm:text-right">
                      <Badge variant={formData.is_active ? 'success' : 'danger'}>
                        {formData.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
              {formData.steps.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40 sm:px-4 sm:py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Ordem das chaves
                  </p>
                  <p className="break-words font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {formData.steps.map((s) => s.key).join(' → ')}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default Automations;
