import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Bot, Plus, Trash2, Edit, Briefcase, Target } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../services/AgentService';
import type { Agent } from '../types/agent';
import { ModalForm, ModalBody, ModalSection } from '../components/ui/Modal';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { FilterBar } from '../components/ui/FilterBar';
import { Input, TextArea } from '../components/ui/Input';

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    objective: '',
    instructions: '',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const data = await agentService.list();
      setAgents(data);
    } catch (err: any) {
      console.error('Erro ao buscar agentes:', err.response?.data);

      if (err.response?.status === 401) {
        localStorage.removeItem('token');
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
    if (!window.confirm('Excluir agente?')) return;
    try {
      await agentService.delete(id);
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
        name: '',
        role: '',
        objective: '',
        instructions: '',
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
      if (currentAgentId) await agentService.update(currentAgentId, formData);
      else await agentService.create(formData);

      toast.success(currentAgentId ? 'Agente atualizado.' : 'Agente criado.');
      setIsModalOpen(false);
      fetchAgents();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível guardar o agente. Verifique a ligação à API.'));
    } finally {
      setSaving(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      agent.name.toLowerCase().includes(q) ||
      agent.role.toLowerCase().includes(q) ||
      agent.objective.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={Bot}
          title="Agentes"
          subtitle="Personas de IA para os fluxos."
          actions={
            <Button onClick={() => handleOpenModal()} className="h-10 w-full gap-2 px-5 sm:h-10 sm:w-auto">
              <Plus size={18} aria-hidden />
              Novo agente
            </Button>
          }
        />

        <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar agentes..." />

        <DataList
          data={filteredAgents}
          isLoading={loading}
          columns={[
            {
              header: 'Nome',
              accessor: 'name',
              className: 'font-bold text-foreground',
            },
            { header: 'Papel', accessor: 'role' },
            {
              header: 'Objetivo',
              accessor: 'objective',
              className: 'hidden md:table-cell max-w-xs truncate',
            },
            {
              header: 'Ações',
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
              className: 'text-right w-14',
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
              menuAriaLabel={`Acções do agente ${agent.name}`}>
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
            <EmptyState
              icon={Bot}
              title="Nenhum agente configurado"
              description="Crie seu primeiro agente para começar a automatizar conversas."
              onAction={() => handleOpenModal()}
            />
          }
        />

        <ModalForm
          formId="agent-form"
          submitDisabled={saving}
          submitLoading={saving}
          submitLabel={saving ? 'Salvando…' : 'Salvar agente'}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          icon={Bot}
          title={currentAgentId ? 'Editar agente' : 'Novo agente'}
          subtitle={
            currentAgentId
              ? 'Papel, objetivo e instruções.'
              : 'Comportamento nas conversas.'
          }>
          <ModalBody>
            <form id="agent-form" onSubmit={handleSubmit}>
              <ModalSection>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome do Agente"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Atendente Comercial"
                  />
                  <Input
                    label="Papel (Role)"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ex: Você é um especialista em vendas."
                  />
                </div>
                <Input
                  label="Objetivo"
                  required
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Ex: Classificar contatos e agendar reuniões."
                />
                <TextArea
                  label="Instruções Comportamentais"
                  required
                  rows={5}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Ex: Seja educado, não ofereça descontos sem permissão..."
                />
              </ModalSection>
            </form>
          </ModalBody>
        </ModalForm>
      </div>
    </Layout>
  );
};

export default Agents;
