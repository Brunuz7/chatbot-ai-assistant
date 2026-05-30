import React, { useEffect, useMemo, useState } from "react";

import Layout from "../components/Layout";

import { Button } from "../components/ui/Button";

import { Badge } from "../components/ui/Badge";

import { Modal } from "../components/ui/Modal";

import { Stepper } from "../components/ui/Stepper";

import { Input, Select, TextArea } from "../components/ui/Input";

import {
  Workflow,
  Plus,
  Pause,
  Play,
  Trash2,
  Edit,
  MessageSquare,
  Type,
  Split,
  Brain,
  UserCheck,
  ArrowDown,
  Rocket,
  ClipboardList,
  ListTodo,
  MapPinned,
  Sparkles,
  ArrowRight,
  Activity,
  Bot,
  Search,
  Filter,
  Layers3,
  Wand2,
  CheckCircle2,
  Loader2,
  Cpu,
  LayoutGrid,
  Table2,
} from "lucide-react";

import api from "../services/api";

type BtnSpec = {
  id: string;
  label: string;
  next: string;
};

interface FlowStep {
  key: string;
  type: string;
  content: string;
  next_step: string;
  metadata: Record<string, any>;
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
  agent?: {
    name: string;
  };
}

function parseTriggerList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function triggerArrayToString(v: unknown): string {
  if (!Array.isArray(v)) return "";

  return v.filter((x) => typeof x === "string").join(", ");
}

function normalizeStepsForApi(
  steps: FlowStep[],
): Omit<FlowStep, "btn_specs">[] {
  return steps.map(({ btn_specs, ...rest }) => {
    if (rest.type === "interactive_buttons") {
      const specs = btn_specs?.filter((b) => b.label.trim()) || [];

      const buttons = specs.map((b) => ({
        id: (b.id || b.label).trim(),
        displayText: b.label.trim(),
      }));

      const button_targets: Record<string, string> = {};

      for (const b of specs) {
        if (!b.next) continue;

        const id = (b.id || b.label).trim();

        button_targets[id] = b.next;

        button_targets[b.label.trim()] = b.next;
      }

      return {
        ...rest,
        metadata: {
          ...(rest.metadata || {}),
          buttons,
          button_targets,
        },
      };
    }

    return rest;
  });
}

const Automations: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);

  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [agentFilter, setAgentFilter] = useState("");

  const [activeWizardStep, setActiveWizardStep] = useState(1);

  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const [formData, setFormData] = useState({
    name: "",
    agent_id: "",
    is_active: true,
    entry_mode: "trigger",
    entry_step_key: "",
    priority: 0,
    keywordsStr: "",
    intentsStr: "",
    eventsStr: "",
    steps: [] as FlowStep[],
  });

  /*
  ====================================
  FETCH
  ====================================
  */

  const fetchData = async () => {
    try {
      setLoading(true);

      const [flowsRes, agentsRes] = await Promise.all([
        api.get("/api/flows"),
        api.get("/api/agents"),
      ]);

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

  /*
  ====================================
  MODAL
  ====================================
  */

  const handleOpenModal = (flow?: Flow) => {
    setActiveWizardStep(1);

    if (flow) {
      setCurrentFlowId(flow.id);

      setFormData({
        name: flow.name,
        agent_id: flow.agent_id,
        is_active: flow.is_active,
        entry_mode: flow.entry_mode || "trigger",
        entry_step_key: flow.entry_step_key || "",
        priority: flow.priority || 0,
        keywordsStr: triggerArrayToString(flow.trigger_keywords),
        intentsStr: triggerArrayToString(flow.trigger_intents),
        eventsStr: triggerArrayToString(flow.entry_events),
        steps: flow.steps || [],
      });
    } else {
      setCurrentFlowId(null);

      setFormData({
        name: "",
        agent_id: agents[0]?.id || "",
        is_active: true,
        entry_mode: "trigger",
        entry_step_key: "",
        priority: 0,
        keywordsStr: "",
        intentsStr: "",
        eventsStr: "",
        steps: [],
      });
    }

    setIsModalOpen(true);
  };

  /*
  ====================================
  DELETE
  ====================================
  */

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este fluxo?")) return;

    try {
      await api.delete(`/api/flows/${id}`);

      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  /*
  ====================================
  STATUS
  ====================================
  */

  const handleToggleStatus = async (flow: Flow) => {
    try {
      await api.put(`/api/flows/${flow.id}`, {
        is_active: !flow.is_active,
      });

      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  /*
  ====================================
  SAVE
  ====================================
  */

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        agent_id: formData.agent_id,
        is_active: formData.is_active,
        entry_mode: formData.entry_mode,
        entry_step_key: formData.entry_step_key || null,
        priority: Number(formData.priority),
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
    } finally {
      setSaving(false);
    }
  };

  /*
  ====================================
  STEPS
  ====================================
  */

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          key: `step_${formData.steps.length + 1}`,
          type: "send_message",
          content: "",
          next_step: "",
          metadata: {},
        },
      ],
    });
  };

  const handleUpdateStep = (index: number, patch: Partial<FlowStep>) => {
    const newSteps = [...formData.steps];

    newSteps[index] = {
      ...newSteps[index],
      ...patch,
    };

    setFormData({
      ...formData,
      steps: newSteps,
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  /*
  ====================================
  FILTERS
  ====================================
  */

  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      const matchesSearch =
        flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAgent = agentFilter === "" || flow.agent_id === agentFilter;

      return matchesSearch && matchesAgent;
    });
  }, [flows, searchTerm, agentFilter]);

  /*
  ====================================
  STATS
  ====================================
  */

  const totalFlows = flows.length;

  const activeFlows = flows.filter((f) => f.is_active).length;

  const pausedFlows = flows.filter((f) => !f.is_active).length;

  const totalSteps = flows.reduce(
    (acc, flow) => acc + (flow.steps?.length || 0),
    0,
  );

  /*
  ====================================
  WIZARD
  ====================================
  */

  const wizardSteps = useMemo(
    () => [
      {
        id: 1,
        title: "Informações",
        icon: ClipboardList,
      },
      {
        id: 2,
        title: "Gatilhos",
        icon: Sparkles,
      },
      {
        id: 3,
        title: "Etapas",
        icon: ListTodo,
      },
      {
        id: 4,
        title: "Mapa",
        icon: MapPinned,
      },
      {
        id: 5,
        title: "Publicar",
        icon: Rocket,
      },
    ],
    [],
  );

  /*
  ====================================
  STEP ICONS
  ====================================
  */

  const getStepIcon = (type: string) => {
    switch (type) {
      case "send_message":
        return <MessageSquare size={18} />;

      case "wait_reply":
        return <Type size={18} />;

      case "condition":
        return <Split size={18} />;

      case "interpret":
        return <Brain size={18} />;

      case "handover":
        return <UserCheck size={18} />;

      default:
        return <Workflow size={18} />;
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          {/* BG EFFECT */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500 blur-[120px]" />

            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
            {/* LEFT */}
            <div className="space-y-5 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />

                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Inteligência Artificial
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white flex items-center gap-4">
                  <Workflow size={46} className="text-cyan-400" />
                  Fluxos IA
                </h1>

                <p className="text-slate-400 mt-4 max-w-2xl leading-relaxed">
                  Crie automações inteligentes, funis de atendimento e jornadas
                  completas utilizando IA integrada aos seus agentes.
                </p>
              </div>

              {/* BUTTONS INSIDE HEADER */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="outline"
                  className="gap-2 h-12 px-5 rounded-2xl border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10"
                >
                  <Wand2 size={18} />
                  Templates IA
                </Button>

                <Button
                  onClick={() => handleOpenModal()}
                  className="gap-2 h-12 px-6 rounded-2xl"
                >
                  <Plus size={18} />
                  Novo Fluxo
                </Button>
              </div>

              {/* BADGES */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="success">{activeFlows} fluxos ativos</Badge>

                <Badge variant="info">IA Inteligente</Badge>

                <Badge variant="warning">Fluxos Automatizados</Badge>
              </div>
            </div>

            {/* RIGHT STATS */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {/* TOTAL */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-cyan-500/10">
                    <Workflow size={24} className="text-cyan-400" />
                  </div>

                  <Badge variant="success">Online</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Total de Fluxos</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {totalFlows}
                  </h2>
                </div>
              </div>

              {/* ACTIVE */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-emerald-500/10">
                    <Activity size={24} className="text-emerald-400" />
                  </div>

                  <Badge variant="success">Ativos</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Fluxos Ativos</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {activeFlows}
                  </h2>
                </div>
              </div>

              {/* PAUSED */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-red-500/10">
                    <Pause size={24} className="text-red-400" />
                  </div>

                  <Badge variant="danger">Pausados</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Fluxos Pausados</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {pausedFlows}
                  </h2>
                </div>
              </div>

              {/* STEPS */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-violet-500/10">
                    <Layers3 size={24} className="text-violet-400" />
                  </div>

                  <Badge variant="info">Etapas</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Total de Etapas</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {totalSteps}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
          {/* TOP FILTERS */}
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar fluxos..."
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-800 bg-slate-950/70 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* FILTER */}
            <div className="w-full xl:w-80">
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10"
                />

                <Select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="pl-10"
                >
                  <option value="">Todos os Agentes</option>

                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* VIEW MODE */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition ${
                  viewMode === "table"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Table2 size={16} />
                Tabela
              </button>

              <button
                onClick={() => setViewMode("cards")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <LayoutGrid size={16} />
                Cards
              </button>
            </div>
          </div>
        </section>

        {/* FLOWS */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={48} className="animate-spin text-cyan-400" />
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center">
            <Workflow size={64} className="mx-auto text-slate-700 mb-6" />

            <h3 className="text-2xl font-black text-white">
              Nenhum fluxo encontrado
            </h3>

            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Crie fluxos inteligentes para automatizar atendimentos, suporte e
              vendas.
            </p>

            <Button className="mt-8" onClick={() => handleOpenModal()}>
              Criar Primeiro Fluxo
            </Button>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFlows.map((flow) => (
              <div
                key={flow.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-xl"
              >
                {/* BG EFFECT */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <Workflow size={24} className="text-cyan-400" />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">
                          {flow.name}
                        </h3>

                        <p className="text-sm text-cyan-400 font-semibold mt-1">
                          Fluxo Inteligente
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(flow)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition"
                      >
                        <Edit size={16} className="text-cyan-400" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(flow)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition"
                      >
                        {flow.is_active ? (
                          <Pause size={16} className="text-yellow-400" />
                        ) : (
                          <Play size={16} className="text-emerald-400" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(flow.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="mt-8 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                        Agente
                      </p>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Bot size={16} className="text-cyan-400" />

                        {flow.agent?.name || "Sem agente"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Etapas
                        </p>

                        <h4 className="text-3xl font-black text-white mt-2">
                          {flow.steps?.length || 0}
                        </h4>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                          Entrada
                        </p>

                        <h4 className="text-sm font-bold text-cyan-400 mt-3">
                          {flow.entry_mode === "trigger"
                            ? "Por gatilho"
                            : "Always Idle"}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
                    <div
                      className={`flex items-center gap-2 text-sm font-semibold ${
                        flow.is_active ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      <CheckCircle2 size={16} />

                      {flow.is_active ? "Ativo" : "Pausado"}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Cpu size={14} />
                      IA Operando
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/70 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Fluxo
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Agente
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Etapas
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Entrada
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="text-right px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFlows.map((flow) => (
                    <tr
                      key={flow.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                            <Workflow size={20} className="text-cyan-400" />
                          </div>

                          <div>
                            <h3 className="font-bold text-white">
                              {flow.name}
                            </h3>

                            <p className="text-sm text-cyan-400">
                              Fluxo Inteligente
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {flow.agent?.name || "Sem agente"}
                      </td>

                      <td className="px-6 py-5 text-white font-bold">
                        {flow.steps?.length || 0}
                      </td>

                      <td className="px-6 py-5 text-cyan-400 font-semibold">
                        {flow.entry_mode === "trigger"
                          ? "Por gatilho"
                          : "Always Idle"}
                      </td>

                      <td className="px-6 py-5">
                        <Badge variant={flow.is_active ? "success" : "danger"}>
                          {flow.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(flow)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition"
                          >
                            <Edit size={16} className="text-cyan-400" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(flow)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-yellow-500/20 transition"
                          >
                            {flow.is_active ? (
                              <Pause size={16} className="text-yellow-400" />
                            ) : (
                              <Play size={16} className="text-emerald-400" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(flow.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentFlowId ? "Editar Fluxo" : "Novo Fluxo"}
          maxWidth="full"
          headerAddon={
            <Stepper
              compact
              steps={wizardSteps}
              currentStep={activeWizardStep}
            />
          }
        >
          {" "}
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {" "}
            {/* STEP 1 */}{" "}
            {activeWizardStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {" "}
                <Input
                  label="Nome do fluxo"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />{" "}
                <Select
                  label="Agente"
                  value={formData.agent_id}
                  onChange={(e) =>
                    setFormData({ ...formData, agent_id: e.target.value })
                  }
                >
                  {" "}
                  <option value="">Selecione</option>{" "}
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {" "}
                      {agent.name}{" "}
                    </option>
                  ))}{" "}
                </Select>{" "}
                <Input
                  label="Etapa Inicial"
                  value={formData.entry_step_key}
                  onChange={(e) =>
                    setFormData({ ...formData, entry_step_key: e.target.value })
                  }
                />{" "}
                <Input
                  type="number"
                  label="Prioridade"
                  value={String(formData.priority)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: Number(e.target.value),
                    })
                  }
                />{" "}
              </div>
            )}{" "}
            {/* STEP 2 */}{" "}
            {activeWizardStep === 2 && (
              <div className="space-y-6">
                {" "}
                <Select
                  label="Modo de entrada"
                  value={formData.entry_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, entry_mode: e.target.value })
                  }
                >
                  {" "}
                  <option value="trigger">Por gatilho</option>{" "}
                  <option value="always_idle">Sempre quando idle</option>{" "}
                </Select>{" "}
                <TextArea
                  label="Palavras-chave"
                  rows={5}
                  value={formData.keywordsStr}
                  onChange={(e) =>
                    setFormData({ ...formData, keywordsStr: e.target.value })
                  }
                />{" "}
                <TextArea
                  label="Intenções"
                  rows={5}
                  value={formData.intentsStr}
                  onChange={(e) =>
                    setFormData({ ...formData, intentsStr: e.target.value })
                  }
                />{" "}
              </div>
            )}{" "}
            {/* STEP 3 */}{" "}
            {activeWizardStep === 3 && (
              <div className="space-y-6">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="text-2xl font-black">
                      Etapas do Fluxo
                    </h3>{" "}
                    <p className="text-slate-500 mt-1">
                      {" "}
                      Configure mensagens e automações.{" "}
                    </p>{" "}
                  </div>{" "}
                  <Button onClick={handleAddStep}>
                    {" "}
                    <Plus size={16} className="mr-2" /> Nova Etapa{" "}
                  </Button>{" "}
                </div>{" "}
                {formData.steps.map((step, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                  >
                    {" "}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
                      {" "}
                      <div className="flex items-center gap-4">
                        {" "}
                        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                          {" "}
                          {getStepIcon(step.type)}{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <h4 className="font-black text-lg text-white">
                            {" "}
                            Etapa {index + 1}{" "}
                          </h4>{" "}
                          <p className="text-sm text-slate-500">
                            {step.key}
                          </p>{" "}
                        </div>{" "}
                      </div>{" "}
                      <Button
                        variant="outline"
                        className="text-red-400"
                        onClick={() => handleRemoveStep(index)}
                      >
                        {" "}
                        <Trash2 size={16} />{" "}
                      </Button>{" "}
                    </div>{" "}
                    <div className="p-6 space-y-6">
                      {" "}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {" "}
                        <Input
                          label="Key"
                          value={step.key}
                          onChange={(e) =>
                            handleUpdateStep(index, { key: e.target.value })
                          }
                        />{" "}
                        <Select
                          label="Tipo"
                          value={step.type}
                          onChange={(e) =>
                            handleUpdateStep(index, { type: e.target.value })
                          }
                        >
                          {" "}
                          <option value="send_message">Mensagem</option>{" "}
                          <option value="wait_reply">Esperar resposta</option>{" "}
                          <option value="condition">Condição</option>{" "}
                          <option value="interpret">IA</option>{" "}
                          <option value="handover">Humano</option>{" "}
                        </Select>{" "}
                      </div>{" "}
                      <TextArea
                        label="Conteúdo"
                        rows={5}
                        value={step.content}
                        onChange={(e) =>
                          handleUpdateStep(index, { content: e.target.value })
                        }
                      />{" "}
                      <Select
                        label="Próxima etapa"
                        value={step.next_step}
                        onChange={(e) =>
                          handleUpdateStep(index, { next_step: e.target.value })
                        }
                      >
                        {" "}
                        <option value="">Finalizar</option>{" "}
                        {formData.steps.map((s) => (
                          <option key={s.key} value={s.key}>
                            {" "}
                            {s.key}{" "}
                          </option>
                        ))}{" "}
                      </Select>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
            {/* STEP 4 */}{" "}
            {activeWizardStep === 4 && (
              <div className="space-y-5">
                {" "}
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex flex-col items-center">
                    {" "}
                    <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                      {" "}
                      <div className="flex items-center justify-between mb-5">
                        {" "}
                        <div className="flex items-center gap-3">
                          {" "}
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            {" "}
                            {getStepIcon(step.type)}{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <div className="font-black text-white">
                              {" "}
                              {step.key}{" "}
                            </div>{" "}
                            <div className="text-sm text-slate-500">
                              {" "}
                              {step.type}{" "}
                            </div>{" "}
                          </div>{" "}
                        </div>{" "}
                        <Badge variant="info">{index + 1}</Badge>{" "}
                      </div>{" "}
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {" "}
                        {step.content || "Sem conteúdo"}{" "}
                      </p>{" "}
                    </div>{" "}
                    {index < formData.steps.length - 1 && (
                      <div className="my-4 flex flex-col items-center">
                        {" "}
                        <ArrowDown className="text-slate-500" />{" "}
                        <div className="text-xs text-slate-500 mt-1">
                          {" "}
                          Próxima etapa{" "}
                        </div>{" "}
                      </div>
                    )}{" "}
                  </div>
                ))}{" "}
              </div>
            )}{" "}
            {/* STEP 5 */}{" "}
            {activeWizardStep === 5 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
                {" "}
                <h3 className="text-3xl font-black mb-8 text-white">
                  {" "}
                  Revisão do fluxo{" "}
                </h3>{" "}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {" "}
                  <div className="rounded-2xl bg-slate-950/50 p-5 border border-slate-800">
                    {" "}
                    <div className="text-sm text-slate-500">
                      Nome do fluxo
                    </div>{" "}
                    <div className="mt-2 font-black text-lg text-white">
                      {" "}
                      {formData.name}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-2xl bg-slate-950/50 p-5 border border-slate-800">
                    {" "}
                    <div className="text-sm text-slate-500">
                      {" "}
                      Agente conectado{" "}
                    </div>{" "}
                    <div className="mt-2 font-black text-lg text-white">
                      {" "}
                      {
                        agents.find((a) => a.id === formData.agent_id)?.name
                      }{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-2xl bg-slate-950/50 p-5 border border-slate-800">
                    {" "}
                    <div className="text-sm text-slate-500">
                      {" "}
                      Total de etapas{" "}
                    </div>{" "}
                    <div className="mt-2 font-black text-lg text-white">
                      {" "}
                      {formData.steps.length}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="rounded-2xl bg-slate-950/50 p-5 border border-slate-800">
                    {" "}
                    <div className="text-sm text-slate-500">Status</div>{" "}
                    <div className="mt-2">
                      {" "}
                      <Badge
                        variant={formData.is_active ? "success" : "danger"}
                      >
                        {" "}
                        {formData.is_active ? "Ativo" : "Pausado"}{" "}
                      </Badge>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {/* FOOTER */}{" "}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              {" "}
              <Button
                variant="outline"
                onClick={() =>
                  activeWizardStep === 1
                    ? setIsModalOpen(false)
                    : setActiveWizardStep((s) => s - 1)
                }
              >
                {" "}
                {activeWizardStep === 1 ? "Cancelar" : "Voltar"}{" "}
              </Button>{" "}
              {activeWizardStep < 5 ? (
                <Button onClick={() => setActiveWizardStep((s) => s + 1)}>
                  {" "}
                  Continuar <ArrowRight size={16} className="ml-2" />{" "}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                >
                  {" "}
                  <Rocket size={16} className="mr-2" />{" "}
                  {saving ? "Salvando..." : "Publicar fluxo"}{" "}
                </Button>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </Modal>
      </div>
    </Layout>
  );
};

export default Automations;
