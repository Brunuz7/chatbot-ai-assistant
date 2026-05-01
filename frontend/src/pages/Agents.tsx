import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Bot, Plus, Trash2, Edit } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { DataList } from '../components/ui/DataList';
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
    name: '',
    role: '',
    objective: '',
    instructions: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchAgents = async () => {
    try {
      const { data } = await api.get('/api/agents');
      setAgents(data);
    } catch (err) {
      console.error(err);
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
        instructions: agent.instructions
      });
    } else {
      setCurrentAgentId(null);
      setFormData({
        name: '',
        role: '',
        objective: '',
        instructions: ''
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
        await api.post('/api/agents', formData);
      }
      setIsModalOpen(false);
      fetchAgents();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         agent.objective.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || agent.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(agents.map(a => a.role)));

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Bot size={32} className="text-primary" />
            Agentes e Fluxos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Gerencie seus agentes de inteligência artificial e os fluxos de automação.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus size={20} />
          Novo Agente
        </Button>
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        searchPlaceholder="Buscar agentes..."
        activeFiltersCount={roleFilter !== '' ? 1 : 0}
        onClear={() => {
          setSearchTerm('');
          setRoleFilter('');
        }}
      >
        <div className="w-full">
          <Select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os Papéis</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataList
        data={filteredAgents}
        isLoading={loading}
        columns={[
          { header: 'Nome', accessor: 'name', className: 'font-bold text-slate-900 dark:text-white' },
          { header: 'Papel', accessor: 'role' },
          { header: 'Objetivo', accessor: 'objective', className: 'hidden md:table-cell max-w-xs truncate' },
          { 
            header: 'Ações', 
            accessor: (agent) => (
              <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleOpenModal(agent)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(agent.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ),
            className: 'text-right'
          }
        ]}
        renderCard={(agent) => (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{agent.name}</h3>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleOpenModal(agent)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(agent.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Papel:</span> {agent.role}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3"><span className="font-semibold text-slate-700 dark:text-slate-300">Objetivo:</span> {agent.objective}</p>
            </div>
          </div>
        )}
        emptyState={
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bot size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Nenhum agente configurado</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Crie seu primeiro agente para começar a automatizar conversas.</p>
            <Button onClick={() => handleOpenModal()} variant="outline">Criar Agente</Button>
          </div>
        }
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={currentAgentId ? 'Editar Agente' : 'Novo Agente'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Nome do Agente"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Atendente Comercial"
              />
            </div>
            
            <div>
              <Input
                label="Papel (Role)"
                required
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                placeholder="Ex: Você é um especialista em vendas."
              />
            </div>
          </div>

          <div>
            <Input
              label="Objetivo"
              required
              value={formData.objective}
              onChange={e => setFormData({...formData, objective: e.target.value})}
              placeholder="Ex: Qualificar leads e agendar reuniões."
            />
          </div>

          <div>
            <TextArea
              label="Instruções Comportamentais"
              required
              rows={5}
              value={formData.instructions}
              onChange={e => setFormData({...formData, instructions: e.target.value})}
              placeholder="Ex: Seja educado, não ofereça descontos sem permissão..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Agente'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Agents;
