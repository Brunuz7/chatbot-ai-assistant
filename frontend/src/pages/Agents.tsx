import React, { useState, useEffect, useMemo } from "react";

import Layout from "../components/Layout";

import { Button } from "../components/ui/Button";

import {
  Bot,
  Plus,
  Trash2,
  Edit,
  Search,
  Sparkles,
  Brain,
  Activity,
  Cpu,
  Filter,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  Table2,
} from "lucide-react";

import api from "../services/api";

import { useNavigate } from "react-router-dom";

import { Modal } from "../components/ui/Modal";

import { Input, Select, TextArea } from "../components/ui/Input";

import { Badge } from "../components/ui/Badge";

interface Agent {
  id: string;
  name: string;
  role: string;
  objective: string;
  instructions: string;
}

const Agents: React.FC = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [roleFilter, setRoleFilter] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    objective: "",
    instructions: "",
  });

  /*
  ====================================
  FETCH AGENTS
  ====================================
  */
  const fetchAgents = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/api/agents");

      setAgents(data);
    } catch (err: any) {
      console.error("Erro ao buscar agentes:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");

        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  /*
  ====================================
  DELETE
  ====================================
  */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este agente?")) return;

    try {
      await api.delete(`/api/agents/${id}`);

      fetchAgents();
    } catch (err) {
      console.error(err);
    }
  };

  /*
  ====================================
  OPEN MODAL
  ====================================
  */
  const handleOpenModal = (agent?: Agent) => {
    if (agent) {
      setCurrentAgentId(agent.id);

      setFormData({
        name: agent.name,
        role: agent.role,
        objective: agent.objective,
        instructions: agent.instructions,
      });
    } else {
      setCurrentAgentId(null);

      setFormData({
        name: "",
        role: "",
        objective: "",
        instructions: "",
      });
    }

    setIsModalOpen(true);
  };

  /*
  ====================================
  SAVE
  ====================================
  */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (currentAgentId) {
        await api.put(`/api/agents/${currentAgentId}`, formData);
      } else {
        await api.post("/api/agents", formData);
      }

      setIsModalOpen(false);

      fetchAgents();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /*
  ====================================
  FILTERED AGENTS
  ====================================
  */
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.objective.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "" || agent.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [agents, searchTerm, roleFilter]);

  /*
  ====================================
  ROLES
  ====================================
  */
  const uniqueRoles = Array.from(new Set(agents.map((a) => a.role)));

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500 blur-[120px]" />

            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
            {/* LEFT */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />

                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Inteligência Artificial
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white flex items-center gap-4">
                  <Bot size={46} className="text-cyan-400" />
                  Agentes IA
                </h1>

                <p className="text-slate-400 mt-4 max-w-2xl leading-relaxed">
                  Crie agentes inteligentes, personalize comportamentos,
                  automatize atendimentos e construa fluxos avançados para seu
                  chatbot.
                </p>
              </div>

              {/* BUTTON INSIDE HEADER */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={() => handleOpenModal()}
                  className="gap-2 h-12 px-6 rounded-2xl"
                >
                  <Plus size={18} />
                  Novo Agente
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="success">
                  {agents.length} agentes ativos
                </Badge>

                <Badge variant="info">IA Inteligente</Badge>

                <Badge variant="warning">Fluxos Automatizados</Badge>
              </div>
            </div>

            {/* RIGHT STATS */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {/* TOTAL */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-cyan-500/10">
                    <Brain size={24} className="text-cyan-400" />
                  </div>

                  <Badge variant="success">Online</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Total Agentes</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {agents.length}
                  </h2>
                </div>
              </div>

              {/* ROLES */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-violet-500/10">
                    <Cpu size={24} className="text-violet-400" />
                  </div>

                  <Badge variant="info">IA</Badge>
                </div>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Papéis</p>

                  <h2 className="text-4xl font-black text-white mt-2">
                    {uniqueRoles.length}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row gap-4">
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
                placeholder="Buscar agentes..."
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-800 bg-slate-950/60 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* FILTER */}
            <div className="w-full lg:w-80">
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10"
                >
                  <option value="">Todos os Papéis</option>

                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

        <section className="flex justify-end mt-5">
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
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 h-10 rounded-xl transition ${
                viewMode === "grid"
                  ? "bg-cyan-500 text-white"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <LayoutGrid size={16} />
              Cards
            </button>
          </div>
        </section>
        </section>

        {/* VIEW TOGGLES */}
        

        {/* AGENTS */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={48} className="animate-spin text-cyan-400" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center">
            <Bot size={64} className="mx-auto text-slate-700 mb-6" />

            <h3 className="text-2xl font-black text-white">
              Nenhum agente encontrado
            </h3>

            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Crie agentes inteligentes para automatizar atendimentos, vendas e
              processos do seu chatbot.
            </p>

            <Button className="mt-8" onClick={() => handleOpenModal()}>
              Criar Primeiro Agente
            </Button>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Agente
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Papel
                    </th>

                    <th className="text-left px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Objetivo
                    </th>

                    <th className="text-right px-6 py-5 text-xs uppercase tracking-wider text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                            <Bot size={18} className="text-cyan-400" />
                          </div>

                          <div>
                            <div className="font-bold text-white">
                              {agent.name}
                            </div>

                            <div className="text-sm text-emerald-400 flex items-center gap-2 mt-1">
                              <CheckCircle2 size={14} />
                              Ativo
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-cyan-400 font-semibold">
                        {agent.role}
                      </td>

                      <td className="px-6 py-5 text-slate-300 max-w-md truncate">
                        {agent.objective}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(agent)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition"
                          >
                            <Edit
                              size={16}
                              className="text-cyan-400"
                            />
                          </button>

                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 transition"
                          >
                            <Trash2
                              size={16}
                              className="text-red-400"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-xl"
              >
                {/* BG EFFECT */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                        <Bot size={24} className="text-cyan-400" />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">
                          {agent.name}
                        </h3>

                        <p className="text-sm text-cyan-400 font-semibold mt-1">
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(agent)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 transition"
                      >
                        <Edit size={16} className="text-cyan-400" />
                      </button>

                      <button
                        onClick={() => handleDelete(agent.id)}
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
                        Objetivo
                      </p>

                      <p className="text-slate-300 leading-relaxed line-clamp-3">
                        {agent.objective}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                        Instruções
                      </p>

                      <p className="text-slate-400 text-sm line-clamp-4 leading-relaxed">
                        {agent.instructions}
                      </p>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle2 size={16} />
                      Ativo
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Activity size={14} />
                      IA Operando
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentAgentId ? "Editar Agente" : "Novo Agente"}
          maxWidth="2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome do Agente"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder="Ex: SDR Inteligente"
              />

              <Input
                label="Papel do Agente"
                required
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value,
                  })
                }
                placeholder="Ex: Especialista em vendas"
              />
            </div>

            <Input
              label="Objetivo"
              required
              value={formData.objective}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  objective: e.target.value,
                })
              }
              placeholder="Ex: Qualificar leads automaticamente"
            />

            <TextArea
              label="Instruções Comportamentais"
              rows={7}
              required
              value={formData.instructions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  instructions: e.target.value,
                })
              }
              placeholder="Defina como o agente deve agir, responder e se comportar..."
            />

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}

                {saving
                  ? "Salvando..."
                  : currentAgentId
                    ? "Salvar Alterações"
                    : "Criar Agente"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Agents;