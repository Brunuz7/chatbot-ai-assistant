import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Bot, Plus, Trash2, Edit, Check, Briefcase, Target } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalBody, ModalFloatingButton, ModalSection } from '../components/ui/Modal';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { FilterBar } from '../components/ui/FilterBar';
import { Input, Select, TextArea } from '../components/ui/Input';

interface Agent {
  id: string;
  name: string;
  role: string;
  objective: string;
  instructions: string;
}

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    objective: "",
    instructions: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/api/agents");
      setAgents(data);
    } catch (err: any) {
      console.error("Erro ao buscar agentes:", err.response?.data);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate('/entrar');
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir agente?")) return;
    try {
      await api.delete(`/api/agents/${id}`);
      fetchAgents();
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
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

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.objective.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "" || agent.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(agents.map((a) => a.role)));

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={Bot}
          title="Agentes"
          subtitle="Personas de IA, instruções e ligação aos fluxos de conversa."
          actions={
            <Button onClick={() => handleOpenModal()} className="h-11 w-full gap-2 sm:h-auto sm:w-auto">
              <Plus size={20} aria-hidden />
              Novo agente
            </Button>
          }
        />

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar agentes..."
        activeFiltersCount={roleFilter !== "" ? 1 : 0}
        onClear={() => {
          setSearchTerm("");
          setRoleFilter("");
        }}
      >
        <div className="w-full">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os Papéis</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataList
        data={filteredAgents}
        isLoading={loading}
        itemLabel="agente"
        columns={[
          {
            header: "Nome",
            accessor: "name",
            className: "font-bold text-slate-900 dark:text-white",
          },
          { header: "Papel", accessor: "role" },
          {
            header: "Objetivo",
            accessor: "objective",
            className: "hidden md:table-cell max-w-xs truncate",
          },
          {
            header: "Ações",
            accessor: (agent) => (
              <CardActionsMenu
                actions={[
                  {
                    label: 'Editar',
                    icon: <Edit size={16} aria-hidden />,
                    onClick: () => handleOpenModal(agent),
                  },
                  {
                    label: 'Excluir',
                    icon: <Trash2 size={16} aria-hidden />,
                    onClick: () => handleDelete(agent.id),
                    variant: 'danger',
                  },
                ]}
              />
            ),
            className: "text-right w-14",
          },
        ]}
        renderCard={(agent) => (
          <DataCard
            title={agent.name}
            actions={[
              {
                label: 'Editar',
                icon: <Edit size={16} aria-hidden />,
                onClick: () => handleOpenModal(agent),
              },
              {
                label: 'Excluir',
                icon: <Trash2 size={16} aria-hidden />,
                onClick: () => handleDelete(agent.id),
                variant: 'danger',
              },
            ]}
            menuAriaLabel={`Acções do agente ${agent.name}`}
          >
            <CardField label="Papel" icon={<Briefcase size={14} aria-hidden />} value={agent.role} />
            <CardField
              label="Objetivo"
              icon={<Target size={14} aria-hidden />}
              value={agent.objective}
              className="[&_span:last-child]:line-clamp-4"
            />
          </DataCard>
        )}
        emptyState={
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bot
              size={48}
              className="mx-auto text-slate-300 dark:text-slate-700 mb-4"
            />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Nenhum agente configurado
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Crie seu primeiro agente para começar a automatizar conversas.
            </p>
            <Button onClick={() => handleOpenModal()} variant="outline">
              Criar Agente
            </Button>
          </div>
        }
      />

      <Modal
        variant="form"
        pageWidth="wide"
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        icon={Bot}
        title={currentAgentId ? 'Editar agente' : 'Novo agente'}
        subtitle={
          currentAgentId
            ? 'Altere papel, objetivo e instruções do agente de IA.'
            : 'Defina como este agente se comporta nas conversas do WhatsApp.'
        }
        floatingAction={
          <ModalFloatingButton type="submit" form="agent-form" disabled={saving}>
            <Check size={18} strokeWidth={2.25} aria-hidden />
            {saving ? 'Salvando…' : 'Salvar agente'}
          </ModalFloatingButton>
        }
      >
        <ModalBody>
        <form id="agent-form" onSubmit={handleSubmit}>
          <ModalSection>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Nome do Agente"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Atendente Comercial"
              />
            </div>

            <div>
              <Input
                label="Papel (Role)"
                required
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="Ex: Você é um especialista em vendas."
              />
            </div>
          </div>
          </ModalSection>

          <ModalSection>
            <Input
              label="Objetivo"
              required
              value={formData.objective}
              onChange={(e) =>
                setFormData({ ...formData, objective: e.target.value })
              }
              placeholder="Ex: Qualificar leads e agendar reuniões."
            />
            <TextArea
              label="Instruções Comportamentais"
              required
              rows={5}
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              placeholder="Ex: Seja educado, não ofereça descontos sem permissão..."
            />
          </ModalSection>
        </form>
        </ModalBody>
      </Modal>
    </div>
    </Layout>
  );
};

export default Agents;
