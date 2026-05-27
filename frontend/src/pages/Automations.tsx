import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { FilterBar } from '../components/ui/FilterBar';
import { Zap, Plus, Play, Pause, Trash2, Edit2, Bot, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';
import { FLOW_TYPE_LABELS } from '../components/flows/flowWizardConstants';
import type { FlowRecord } from '../lib/flowForm';

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const flowsResult = await api.get<FlowRecord[]>('/api/flows');
      setFlows(Array.isArray(flowsResult.data) ? flowsResult.data : []);
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
    const q = searchTerm.toLowerCase();
    const instruction = String(flow.entry_instruction ?? '').toLowerCase();
    return flow.name.toLowerCase().includes(q) || instruction.includes(q);
  });

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Zap}
          title="Fluxos de conversa"
          subtitle="Cada fluxo é um passo no WhatsApp. A IA escolhe qual iniciar com base na instrução de cada um."
          actions={
            <Button onClick={() => navigate('/fluxos/novo')} className="gap-2 w-full sm:w-auto">
              <Plus size={20} /> Novo fluxo
            </Button>
          }
        />

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar por nome ou instrução de início..."
          activeFiltersCount={0}
          onClear={() => setSearchTerm('')}
        >
          <span className="sr-only">Sem filtros adicionais</span>
        </FilterBar>

        <DataList
          data={filteredFlows}
          isLoading={loading}
          itemLabel="fluxo"
          columns={[
            { header: 'Nome', accessor: 'name', className: 'font-bold text-slate-900 dark:text-white' },
            {
              header: 'Ação',
              accessor: (flow) => (
                <Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || 'interpret'] || flow.type || '—'}</Badge>
              ),
            },
            {
              header: 'Quando inicia',
              accessor: (flow) => (
                <span className="line-clamp-2 text-slate-600 dark:text-slate-400">
                  {flow.entry_instruction?.trim() || '—'}
                </span>
              ),
              className: 'max-w-xs',
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
                <CardActionsMenu
                  actions={[
                    {
                      label: 'Editar',
                      icon: <Edit2 size={16} aria-hidden />,
                      onClick: () => navigate(`/fluxos/${flow.id}/editar`),
                    },
                    {
                      label: flow.is_active ? 'Pausar' : 'Ativar',
                      icon: flow.is_active ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />,
                      onClick: () => handleToggleStatus(flow),
                    },
                    {
                      label: 'Excluir',
                      icon: <Trash2 size={16} aria-hidden />,
                      onClick: () => handleDelete(flow.id),
                      variant: 'danger',
                    },
                  ]}
                />
              ),
              className: 'text-right w-14',
            },
          ]}
          renderCard={(flow) => (
            <DataCard
              title={flow.name}
              onClick={() => navigate(`/fluxos/${flow.id}/editar`)}
              actions={[
                {
                  label: 'Editar',
                  icon: <Edit2 size={16} aria-hidden />,
                  onClick: () => navigate(`/fluxos/${flow.id}/editar`),
                },
                {
                  label: flow.is_active ? 'Pausar' : 'Ativar',
                  icon: flow.is_active ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />,
                  onClick: () => handleToggleStatus(flow),
                },
                {
                  label: 'Excluir',
                  icon: <Trash2 size={16} aria-hidden />,
                  onClick: () => handleDelete(flow.id),
                  variant: 'danger',
                },
              ]}
              menuAriaLabel={`Acções do fluxo ${flow.name}`}
            >
              <CardField
                label="Quando inicia"
                value={flow.entry_instruction?.trim() || '—'}
                className="[&_span:last-child]:line-clamp-3"
              />
              <CardField
                label="Estado"
                value={
                  <Badge variant={flow.is_active ? 'success' : 'danger'}>
                    {flow.is_active ? 'Ativo' : 'Pausado'}
                  </Badge>
                }
              />
              <CardField
                label="Tipo"
                icon={<Zap size={14} aria-hidden />}
                value={
                  <Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || ''] || flow.type}</Badge>
                }
              />
              {flow.agent?.name ? (
                <CardField label="Agente (IA)" icon={<Bot size={14} aria-hidden />} value={flow.agent.name} />
              ) : null}
              <CardField
                label="Próximo fluxo"
                icon={<GitBranch size={14} aria-hidden />}
                value={
                  flow.next_flow_id
                    ? flows.find((f) => f.id === flow.next_flow_id)?.name || '—'
                    : '—'
                }
              />
            </DataCard>
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
              <Button onClick={() => navigate('/fluxos/novo')}>Criar primeiro fluxo</Button>
            </div>
          }
        />
      </div>
    </Layout>
  );
};

export default Automations;
