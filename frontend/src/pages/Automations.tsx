import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataList } from '../components/ui/DataList';
import { FilterBar } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Input';
import { Zap, Plus, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import { FLOW_TYPE_LABELS } from '../components/flows/flowWizardConstants';
import type { FlowRecord } from '../lib/flowForm';

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  const fetchData = async () => {
    try {
      const [flowsResult, agentsResult] = await Promise.allSettled([
        api.get<FlowRecord[]>('/api/flows'),
        api.get<{ id: string; name: string }[]>('/api/agents'),
      ]);

      if (flowsResult.status === 'fulfilled') {
        setFlows(Array.isArray(flowsResult.value.data) ? flowsResult.value.data : []);
      } else {
        toast.error(getApiErrorMessage(flowsResult.reason, 'Não foi possível carregar os fluxos.'));
      }

      if (agentsResult.status === 'fulfilled') {
        setAgents(Array.isArray(agentsResult.value.data) ? agentsResult.value.data : []);
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível carregar os fluxos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este fluxo?')) return;
    try {
      await api.delete(`/api/flows/${id}`);
      toast.success('Fluxo eliminado.');
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível eliminar o fluxo.'));
    }
  };

  const handleToggleStatus = async (flow: FlowRecord) => {
    try {
      await api.put(`/api/flows/${flow.id}`, { is_active: !flow.is_active });
      toast.success(flow.is_active ? 'Fluxo pausado.' : 'Fluxo ativado.');
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar o estado do fluxo.'));
    }
  };

  const filteredFlows = flows.filter((flow) => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = agentFilter === '' || flow.agent_id === agentFilter;
    return matchesSearch && matchesAgent;
  });

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Zap}
          title="Fluxos de conversa"
          subtitle="Cada fluxo é um passo no WhatsApp. Crie, edite e ligue vários fluxos em sequência."
          actions={
            <Button onClick={() => navigate('/automations/new')} className="gap-2 w-full sm:w-auto">
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
              header: 'Ação',
              accessor: (flow) => (
                <Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || 'interpret'] || flow.type || '—'}</Badge>
              ),
            },
            {
              header: 'Início',
              accessor: (flow) => (
                <Badge variant="outline">
                  {flow.entry_mode === 'trigger' ? 'Por frases' : 'Qualquer mensagem'}
                </Badge>
              ),
            },
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/automations/${flow.id}/edit`)}
                  >
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
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/automations/${flow.id}/edit`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/automations/${flow.id}/edit`);
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-primary/20 transition-all h-full flex flex-col cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{flow.name}</h3>
                  <Badge variant="default" className="mt-1">
                    {flow.agent?.name || 'Desconhecido'}
                  </Badge>
                </div>
                <Badge variant={flow.is_active ? 'success' : 'danger'}>{flow.is_active ? 'Ativo' : 'Pausado'}</Badge>
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                <Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || ''] || flow.type}</Badge>
                <Badge variant="outline">{flow.entry_mode === 'trigger' ? 'Por frases' : 'Qualquer mensagem'}</Badge>
              </div>
              {flow.next_flow_id ? (
                <p className="text-xs text-slate-500 mt-2">
                  Depois: {flows.find((f) => f.id === flow.next_flow_id)?.name || '—'}
                </p>
              ) : null}
              <div
                className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/automations/${flow.id}/edit`)}
                >
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
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full w-fit mx-auto shadow-sm mb-4">
                <Zap size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum fluxo ainda</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm">
                Crie o primeiro passo da conversa no WhatsApp.
              </p>
              <Button onClick={() => navigate('/automations/new')}>Criar primeiro fluxo</Button>
            </div>
          }
        />
      </div>
    </Layout>
  );
};

export default Automations;
