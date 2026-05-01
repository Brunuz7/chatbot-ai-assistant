import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
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
  ArrowDown,
  LayoutGrid,
  Megaphone,
  Rocket,
  ClipboardList,
  ListTodo,
  MapPinned,
} from 'lucide-react';
import api from '../services/api';

type BtnSpec = { id: string; label: string; next: string };

interface FlowStep {
  key: string;
  type: string;
  content: string;
  next_step: string;
  metadata: Record<string, unknown>;
  btn_specs?: BtnSpec[];
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

function normalizeStepsForApi(steps: FlowStep[]): Omit<FlowStep, 'btn_specs'>[] {
  return steps.map(({ btn_specs, ...rest }) => {
    if (rest.type === 'interactive_buttons') {
      const specs = btn_specs?.filter((b) => b.label.trim()) || [];
      const stepDefaultNext = (rest.next_step || '').trim();
      const buttons = specs.map((b) => ({
        id: (b.id || b.label).trim(),
        displayText: b.label.trim(),
      }));
      const button_targets: Record<string, string> = {};
      for (const b of specs) {
        const next = b.next.trim() || stepDefaultNext;
        if (!next) continue;
        const id = (b.id || b.label).trim();
        button_targets[id] = next;
        button_targets[b.label.trim()] = next;
      }
      const meta = {
        ...(rest.metadata || {}),
        title: (rest.metadata.title as string) || rest.content || 'Escolha uma opção',
        buttons,
        button_targets,
      };
      return { ...rest, metadata: meta, content: rest.content || (meta.title as string) };
    }
    return rest;
  });
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
    keywordsStr: '',
    intentsStr: '',
    eventsStr: '',
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
      const steps: FlowStep[] = (flow.steps || []).map((s) => {
        const meta = (s.metadata || {}) as Record<string, unknown>;
        const buttons = (meta.buttons as Array<{ id: string; displayText: string }>) || [];
        const targets = (meta.button_targets as Record<string, string>) || {};
        let btn_specs: BtnSpec[] | undefined;
        if (s.type === 'interactive_buttons' && buttons.length) {
          btn_specs = buttons.map((b) => ({
            id: b.id,
            label: b.displayText,
            next: targets[b.id] || targets[b.displayText] || '',
          }));
        }
        return {
          ...s,
          metadata: meta as Record<string, unknown>,
          btn_specs: btn_specs?.length ? btn_specs : [{ id: '', label: '', next: '' }],
        };
      });
      setFormData({
        name: flow.name,
        agent_id: flow.agent_id,
        is_active: flow.is_active,
        entry_mode: flow.entry_mode || 'always_idle',
        entry_step_key: flow.entry_step_key || '',
        priority: flow.priority ?? 0,
        keywordsStr: triggerArrayToString(flow.trigger_keywords),
        intentsStr: triggerArrayToString(flow.trigger_intents),
        eventsStr: triggerArrayToString(flow.entry_events),
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
        keywordsStr: '',
        intentsStr: '',
        eventsStr: '',
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
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (flow: Flow) => {
    try {
      await api.put(`/api/flows/${flow.id}`, { is_active: !flow.is_active });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        agent_id: formData.agent_id,
        is_active: formData.is_active,
        entry_mode: formData.entry_mode,
        entry_step_key: formData.entry_step_key.trim() || null,
        priority: Number(formData.priority) || 0,
        trigger_keywords: parseTriggerList(formData.keywordsStr),
        trigger_intents: parseTriggerList(formData.intentsStr),
        entry_events: parseTriggerList(formData.eventsStr),
        steps: normalizeStepsForApi(formData.steps),
      };
      if (currentFlowId) {
        await api.put(`/api/flows/${currentFlowId}`, payload);
      } else {
        await api.post(`/api/agents/${formData.agent_id}/flows`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fluxo');
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
      { id: 1, title: 'Informações', description: 'Nome e agente', icon: ClipboardList },
      { id: 2, title: 'Gatilhos', description: 'Palavras e prioridade', icon: Zap },
      { id: 3, title: 'Etapas', description: 'Mensagens e ações', icon: ListTodo },
      { id: 4, title: 'Mapa', description: 'Visualização', icon: MapPinned },
      { id: 5, title: 'Publicar', description: 'Revisão final', icon: Rocket },
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
      case 'interactive_buttons':
      case 'buttons':
        return <LayoutGrid size={18} />;
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
      case 'interactive_buttons':
      case 'buttons':
        return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20';
      case 'handover':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const flowPreview = useMemo(() => {
    return normalizeStepsForApi(formData.steps);
  }, [formData.steps]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Fluxos de conversa</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Fluxos guiados no WhatsApp (Evolution), com IA só para mensagens livres quando não há fluxo ativo.
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={20} /> Novo fluxo
          </Button>
        </header>

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
        maxWidth="full"
        headerAddon={<Stepper compact steps={wizardSteps} currentStep={activeWizardStep} />}
        footer={
          <div className="max-w-4xl mx-auto w-full flex justify-between gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => (activeWizardStep === 1 ? handleCloseModal() : setActiveWizardStep((s) => s - 1))}
            >
              {activeWizardStep === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            <div className="flex gap-3">
              {activeWizardStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => setActiveWizardStep((s) => s + 1)}
                  disabled={activeWizardStep === 1 && (!formData.name.trim() || !formData.agent_id)}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit()}
                  disabled={saving || !formData.name.trim() || !formData.agent_id}
                  className="bg-green-600 hover:bg-green-700 border-green-600 gap-2"
                >
                  <Rocket size={18} />
                  {saving ? 'Publicando…' : 'Publicar fluxo'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
          {activeWizardStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-5 flex gap-3">
                <Megaphone className="text-primary shrink-0 mt-0.5" size={22} />
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Para quem é este fluxo?</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    O agente de IA responde perguntas livres apenas quando nenhum fluxo está ativo. Quando um fluxo está em
                    execução, ele tem prioridade até terminar ou ser trocado por outro gatilho.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome do fluxo"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex.: Boas-vindas"
                />
                <Select
                  label="Agente responsável"
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
              <Input
                label="Primeira etapa (opcional)"
                value={formData.entry_step_key}
                onChange={(e) => setFormData({ ...formData, entry_step_key: e.target.value })}
                placeholder="Deixe vazio para usar automaticamente “start” ou a primeira etapa"
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Fluxo ativo ao salvar</span>
              </label>
            </div>
          )}

          {activeWizardStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Como este fluxo começa?"
                  value={formData.entry_mode}
                  onChange={(e) => setFormData({ ...formData, entry_mode: e.target.value })}
                >
                  <option value="trigger">Somente com palavras-chave / intenção / evento</option>
                  <option value="always_idle">Qualquer mensagem (quando não há outro fluxo ativo)</option>
                </Select>
                <Input
                  label="Prioridade (maior vence empates)"
                  type="number"
                  value={String(formData.priority)}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                />
              </div>
              <TextArea
                label="Palavras-chave (uma ou várias, separadas por vírgula ou linha)"
                value={formData.keywordsStr}
                onChange={(e) => setFormData({ ...formData, keywordsStr: e.target.value })}
                placeholder="oi, olá, bom dia"
                rows={3}
              />
              <TextArea
                label="Frases de intenção (trechos que podem aparecer na mensagem)"
                value={formData.intentsStr}
                onChange={(e) => setFormData({ ...formData, intentsStr: e.target.value })}
                placeholder="quero comprar, suporte"
                rows={2}
              />
              <TextArea
                label="Eventos de entrada (identificadores vindos do webhook, opcional)"
                value={formData.eventsStr}
                onChange={(e) => setFormData({ ...formData, eventsStr: e.target.value })}
                placeholder="ex.: promo.blackfriday"
                rows={2}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Em modo “gatilhos”, o fluxo só entra se alguma palavra-chave, intenção ou evento coincidir. Em modo “qualquer
                mensagem”, ele compete com outros fluxos do mesmo tipo pela prioridade.
              </p>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h4 className="font-bold text-slate-800 dark:text-white">Etapas sequenciais</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep} className="gap-2">
                  <Plus size={16} /> Adicionar etapa
                </Button>
              </div>

              <div className="space-y-4 pr-1">
                {formData.steps.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 text-sm px-6">
                      Adicione uma etapa inicial do tipo <strong>Enviar mensagem</strong> para cumprimentar, depois use{' '}
                      <strong>Aguardar resposta</strong> ou <strong>Botões</strong>.
                    </p>
                    <Button variant="ghost" size="sm" className="mt-4" onClick={handleAddStep}>
                      Adicionar primeira etapa
                    </Button>
                  </div>
                ) : (
                  formData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-all shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${getStepColor(step.type)}`}>{getStepIcon(step.type)}</div>
                          <div className="min-w-0">
                            <input
                              className="bg-transparent font-black outline-none border-b border-transparent focus:border-primary text-slate-900 dark:text-white px-0 py-0 text-base w-full max-w-[220px]"
                              value={step.key}
                              onChange={(e) => handleUpdateStep(index, { key: e.target.value })}
                              placeholder="id_do_passo"
                            />
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Identificador único</p>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Select
                          label="Tipo de ação"
                          value={step.type}
                          onChange={(e) => {
                            const t = e.target.value;
                            const patch: Partial<FlowStep> = { type: t };
                            if (t === 'interactive_buttons') {
                              patch.btn_specs = step.btn_specs?.length
                                ? step.btn_specs
                                : [
                                    { id: 'a', label: 'Opção A', next: '' },
                                    { id: 'b', label: 'Opção B', next: '' },
                                  ];
                            }
                            handleUpdateStep(index, patch);
                          }}
                        >
                          <option value="send_message">Enviar mensagem</option>
                          <option value="interactive_buttons">Botões interativos</option>
                          <option value="wait_reply">Aguardar resposta livre</option>
                          <option value="set_state">Salvar dados (set state)</option>
                          <option value="goto">Ir para etapa (goto)</option>
                          <option value="interpret">Interpretar texto com IA (sem controlar fluxo)</option>
                          <option value="condition">Condição / desvio</option>
                          <option value="handover">Encaminhar para humano</option>
                          <option value="start">Marco inicial (start)</option>
                        </Select>
                        <Select
                          label="Próxima etapa"
                          value={step.next_step || ''}
                          onChange={(e) => handleUpdateStep(index, { next_step: e.target.value })}
                        >
                          <option value="">Automático ou fim (segundo o tipo)</option>
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
                          label="Texto da mensagem (use {{nome_var}} para variáveis salvas)"
                          value={step.content || ''}
                          onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                          placeholder="Olá! Como podemos ajudar?"
                          rows={3}
                        />
                      )}

                      {step.type === 'interactive_buttons' && (
                        <div className="space-y-4">
                          <Input
                            label="Título / pergunta"
                            value={step.content || ''}
                            onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                            placeholder="Como podemos ajudar?"
                          />
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Botões (máx. 3 no WhatsApp)</p>
                          {(step.btn_specs || []).slice(0, 3).map((btn, bi) => (
                            <div key={bi} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                              <Input
                                label="ID técnico"
                                value={btn.id}
                                onChange={(e) => {
                                  const specs = [...(step.btn_specs || [])];
                                  specs[bi] = { ...specs[bi], id: e.target.value };
                                  handleUpdateStep(index, { btn_specs: specs });
                                }}
                                placeholder="opcao_a"
                              />
                              <Input
                                label="Texto no botão"
                                value={btn.label}
                                onChange={(e) => {
                                  const specs = [...(step.btn_specs || [])];
                                  specs[bi] = { ...specs[bi], label: e.target.value };
                                  handleUpdateStep(index, { btn_specs: specs });
                                }}
                                placeholder="Vendas"
                              />
                              <Select
                                label="Ir para etapa"
                                value={btn.next}
                                onChange={(e) => {
                                  const specs = [...(step.btn_specs || [])];
                                  specs[bi] = { ...specs[bi], next: e.target.value };
                                  handleUpdateStep(index, { btn_specs: specs });
                                }}
                              >
                                <option value="">Escolher…</option>
                                {formData.steps.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.key}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.type === 'wait_reply' && (
                        <>
                          <TextArea
                            label="Pergunta ao cliente (opcional)"
                            value={step.content || ''}
                            onChange={(e) => handleUpdateStep(index, { content: e.target.value })}
                            rows={2}
                          />
                          <Input
                            label="Nome da variável para guardar a resposta"
                            value={(step.metadata.variable as string) || ''}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, variable: e.target.value } })
                            }
                            placeholder="nome_cliente"
                          />
                        </>
                      )}

                      {step.type === 'set_state' && (
                        <TextArea
                          label="Pares chave:valor (JSON simples), ex: { &quot;etapa&quot;: &quot;qualificado&quot; }"
                          value={
                            step.metadata.patch
                              ? JSON.stringify(step.metadata.patch, null, 2)
                              : JSON.stringify(step.metadata.assignments || {}, null, 2)
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value || '{}');
                              handleUpdateStep(index, { metadata: { ...step.metadata, patch: parsed } });
                            } catch {
                              handleUpdateStep(index, { metadata: { ...step.metadata, patch: {} } });
                            }
                          }}
                          rows={3}
                        />
                      )}

                      {step.type === 'goto' && (
                        <Select
                          label="Etapa destino"
                          value={(step.metadata.target_step as string) || ''}
                          onChange={(e) =>
                            handleUpdateStep(index, { metadata: { ...step.metadata, target_step: e.target.value } })
                          }
                        >
                          <option value="">Selecione…</option>
                          {formData.steps.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.key}
                            </option>
                          ))}
                        </Select>
                      )}

                      {step.type === 'interpret' && (
                        <TextArea
                          label="Instrução para extrair dados em JSON (sem decidir o fluxo)"
                          value={(step.metadata.extract_instruction as string) || ''}
                          onChange={(e) =>
                            handleUpdateStep(index, { metadata: { ...step.metadata, extract_instruction: e.target.value } })
                          }
                          placeholder='Ex.: Extraia "nome", "cidade" e "produto" se mencionados.'
                          rows={3}
                        />
                      )}

                      {step.type === 'condition' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <Input
                            label="Variável no contexto"
                            value={(step.metadata.variable as string) || ''}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, variable: e.target.value } })
                            }
                          />
                          <Select
                            label="Operador"
                            value={(step.metadata.operator as string) || 'equals'}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, operator: e.target.value } })
                            }
                          >
                            <option value="equals">Igual a</option>
                            <option value="contains">Contém</option>
                          </Select>
                          <Input
                            label="Valor comparado"
                            value={String(step.metadata.value ?? '')}
                            onChange={(e) =>
                              handleUpdateStep(index, { metadata: { ...step.metadata, value: e.target.value } })
                            }
                          />
                          <div className="md:col-span-2 grid grid-cols-2 gap-2">
                            <Select
                              label="Se verdadeiro → etapa"
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
                              label="Se falso → etapa"
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

          {activeWizardStep === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-900">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <LayoutGrid size={18} /> Mapa rápido
                </h4>
                {flowPreview.length === 0 ? (
                  <p className="text-sm text-slate-500">Adicione etapas para visualizar o fluxo.</p>
                ) : (
                  <ul className="space-y-2">
                    {flowPreview.map((s, i) => (
                      <li key={`${s.key}-${i}`} className="flex flex-col items-center">
                        <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary font-bold">{s.key}</span>
                            <Badge variant="outline">{s.type}</Badge>
                          </div>
                          {s.content ? (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3">{s.content}</p>
                          ) : null}
                          {s.next_step ? (
                            <p className="text-[10px] text-slate-400 mt-1">próximo padrão: → {s.next_step}</p>
                          ) : null}
                        </div>
                        {i < flowPreview.length - 1 ? (
                          <ArrowDown className="text-slate-300 my-1" size={18} aria-hidden />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeWizardStep === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-slate-50/80 dark:bg-slate-800/40">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Rocket size={18} /> Revisão
                </h4>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <dt className="text-slate-500">Nome</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white text-right">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <dt className="text-slate-500">Agente</dt>
                    <dd className="font-semibold text-right">{agents.find((a) => a.id === formData.agent_id)?.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <dt className="text-slate-500">Modo de entrada</dt>
                    <dd className="font-semibold text-right">
                      {formData.entry_mode === 'trigger' ? 'Gatilhos' : 'Qualquer mensagem (idle)'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <dt className="text-slate-500">Etapas</dt>
                    <dd className="font-semibold text-right">{formData.steps.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Publicação</dt>
                    <dd>
                      <Badge variant={formData.is_active ? 'success' : 'danger'}>
                        {formData.is_active ? 'Ativo ao salvar' : 'Salvo pausado'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ative o chatbot na instância Evolution (painel / configurações) e confirme que o webhook aponta para este
                backend para receber mensagens em tempo real.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default Automations;
