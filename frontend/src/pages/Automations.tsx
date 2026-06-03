import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataList } from "../components/ui/DataList";
import { DataCard, CardField, CardActionsMenu } from "../components/ui/Card";
import { Select } from "../components/ui/Input";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Bot,
  GitBranch,
  Sparkles,
  Activity,
  Layers3,
  Wand2,
  Search,
  Filter,
  Table2,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import api from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { FLOW_TYPE_LABELS } from "../components/flows/flowWizardConstants";
import type { FlowRecord } from "../lib/flowForm";

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [flowsResult, agentsResult] = await Promise.all([
        api.get<FlowRecord[]>("/api/flows"),
        api.get<{ id: string; name: string }[]>("/api/agents"),
      ]);
      setFlows(Array.isArray(flowsResult.data) ? flowsResult.data : []);
      setAgents(Array.isArray(agentsResult.data) ? agentsResult.data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        getApiErrorMessage(
          err,
          "Não foi possível carregar os dados das automações.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este fluxo?")) return;

    try {
      await api.delete(`/api/flows/${id}`);
      toast.success("Fluxo eliminado.");
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(
        getApiErrorMessage(err, "Não foi possível eliminar o fluxo."),
      );
    }
  };

  const handleToggleStatus = async (flow: FlowRecord) => {
    try {
      await api.put(`/api/flows/${flow.id}`, { is_active: !flow.is_active });
      toast.success(flow.is_active ? "Fluxo pausado." : "Fluxo ativado.");
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(
        getApiErrorMessage(err, "Não foi possível alterar o estado do fluxo."),
      );
    }
  };

  // Filtros combinados do Painel Superior
  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      const q = searchTerm.toLowerCase();
      const instruction = String(flow.entry_instruction ?? "").toLowerCase();
      const matchesSearch =
        flow.name.toLowerCase().includes(q) || instruction.includes(q);
      const matchesAgent = agentFilter === "" || flow.agent_id === agentFilter;

      return matchesSearch && matchesAgent;
    });
  }, [flows, searchTerm, agentFilter]);

  // Estatísticas Dinâmicas para os Cards Superiores
  const totalFlows = flows.length;
  const activeFlows = flows.filter((f) => f.is_active).length;
  const pausedFlows = flows.filter((f) => !f.is_active).length;
  const totalSteps = flows.reduce(
    (acc, flow) => acc + (flow.steps?.length || 0),
    0,
  );

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in text-slate-100">
        {/* ========================================== HERO COM ESTILO FUTURISTA E NEON ========================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500 blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
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
                  Cada fluxo representa etapas estratégicas no WhatsApp. A IA
                  decide qual fluxo acionar de forma autônoma baseada na
                  instrução de entrada definida.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="outline"
                  className="gap-2 h-12 px-5 rounded-2xl border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-white"
                >
                  <Wand2 size={18} />
                  Templates IA
                </Button>

                <Button
                  onClick={() => navigate("/fluxos/novo")}
                  className="gap-2 h-12 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <Plus size={18} />
                  Novo Fluxo
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="success">{activeFlows} fluxos ativos</Badge>
                <Badge variant="info">IA Inteligente</Badge>
                <Badge variant="warning">Fluxos Automatizados</Badge>
              </div>
            </div>

            {/* PAINEL DE CONTADORES E METRICAS */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
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

        {/* ========================================== FILTROS AVANÇADOS ========================================== */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou instrução de início..."
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-800 bg-slate-950/70 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="w-full xl:w-80">
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10"
                />
                <Select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-800 text-white"
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
                <Table2 size={16} /> Tabela
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <LayoutGrid size={16} /> Cards
              </button>
            </div>
          </div>
        </section>

        {/* ========================================== COMPONENTE CENTRAL DE DADOS ========================================== */}
        {viewMode === "table" ? (
          <DataList
            data={filteredFlows}
            isLoading={loading}
            itemLabel="fluxo"
            renderCard={() => null} // 👈 Adicionado para satisfazer a tipagem obrigatória do componente genérico
            columns={[
              {
                header: "Nome do Fluxo",
                accessor: "name",
                className: "font-bold text-white",
              },
              {
                header: "Ação / Comportamento",
                accessor: (flow) => (
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400"
                  >
                    {FLOW_TYPE_LABELS[flow.type || "interpret"] ||
                      flow.type ||
                      "—"}
                  </Badge>
                ),
              },
              {
                header: "Instrução de Entrada (Gatilho)",
                accessor: (flow) => (
                  <span className="line-clamp-2 text-slate-400">
                    {flow.entry_instruction?.trim() || "—"}
                  </span>
                ),
                className: "max-w-xs",
              },
              {
                header: "Status",
                accessor: (flow) => (
                  <Badge variant={flow.is_active ? "success" : "danger"}>
                    {flow.is_active ? "Ativo" : "Pausado"}
                  </Badge>
                ),
              },
              {
                header: "Ações",
                accessor: (flow) => (
                  <CardActionsMenu
                    actions={[
                      {
                        label: "Editar fluxo",
                        icon: <Edit2 size={16} aria-hidden />,
                        onClick: () => navigate(`/fluxos/${flow.id}/editar`),
                      },
                      {
                        label: flow.is_active ? "Pausar fluxo" : "Ativar fluxo",
                        icon: flow.is_active ? (
                          <Pause size={16} aria-hidden />
                        ) : (
                          <Play size={16} aria-hidden />
                        ),
                        onClick: () => handleToggleStatus(flow),
                      },
                      {
                        label: "Excluir registro",
                        icon: <Trash2 size={16} aria-hidden />,
                        onClick: () => handleDelete(flow.id),
                        variant: "danger",
                      },
                    ]}
                  />
                ),
                className: "text-right w-14",
              },
            ]}
            emptyState={
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                <div className="bg-slate-950 p-4 rounded-full w-fit mx-auto shadow-sm mb-4 border border-slate-800">
                  <Workflow size={32} className="text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Nenhum fluxo encontrado
                </h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm mt-2">
                  Comece criando o primeiro passo ou gatilho da jornada
                  automatizada do seu WhatsApp.
                </p>
                <Button
                  onClick={() => navigate("/fluxos/novo")}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Criar primeiro fluxo
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFlows.length === 0 && !loading ? (
              <div className="col-span-full text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                <div className="bg-slate-950 p-4 rounded-full w-fit mx-auto shadow-sm mb-4 border border-slate-800">
                  <Workflow size={32} className="text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Nenhum fluxo encontrado
                </h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm mt-2">
                  Comece criando o primeiro passo ou gatilho da jornada
                  automatizada do seu WhatsApp.
                </p>
                <Button
                  onClick={() => navigate("/fluxos/novo")}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Criar primeiro fluxo
                </Button>
              </div>
            ) : (
              filteredFlows.map((flow) => (
                <DataCard
                  key={flow.id}
                  title={flow.name}
                  onClick={() => navigate(`/fluxos/${flow.id}/editar`)}
                  actions={[
                    {
                      label: "Editar",
                      icon: <Edit2 size={16} aria-hidden />,
                      onClick: () => navigate(`/fluxos/${flow.id}/editar`),
                    },
                    {
                      label: flow.is_active ? "Pausar" : "Ativar",
                      icon: flow.is_active ? (
                        <Pause size={16} aria-hidden />
                      ) : (
                        <Play size={16} aria-hidden />
                      ),
                      onClick: () => handleToggleStatus(flow),
                    },
                    {
                      label: "Excluir",
                      icon: <Trash2 size={16} aria-hidden />,
                      onClick: () => handleDelete(flow.id),
                      variant: "danger",
                    },
                  ]}
                  menuAriaLabel={`Ações do fluxo ${flow.name}`}
                  className="bg-slate-900/60 border-slate-800 backdrop-blur-xl relative group overflow-hidden text-slate-100"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardField
                    label="Quando inicia"
                    value={flow.entry_instruction?.trim() || "—"}
                    className="[&_span:last-child]:line-clamp-3 text-slate-300"
                  />
                  <CardField
                    label="Estado operacional"
                    value={
                      <Badge variant={flow.is_active ? "success" : "danger"}>
                        {flow.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                    }
                  />
                  <CardField
                    label="Tipo"
                    icon={<Workflow size={14} className="text-cyan-400" />}
                    value={
                      <Badge
                        variant="outline"
                        className="border-cyan-500/20 text-cyan-400"
                      >
                        {FLOW_TYPE_LABELS[flow.type || ""] || flow.type}
                      </Badge>
                    }
                  />
                  {flow.agent?.name && (
                    <CardField
                      label="Agente Vinculado"
                      icon={<Bot size={14} className="text-cyan-400" />}
                      value={flow.agent.name}
                    />
                  )}
                  <CardField
                    label="Encadeamento de Fluxo"
                    icon={<GitBranch size={14} className="text-cyan-400" />}
                    value={
                      flow.next_flow_id
                        ? flows.find((f) => f.id === flow.next_flow_id)?.name ||
                          "—"
                        : "—"
                    }
                  />
                </DataCard>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Automations;
