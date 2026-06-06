import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu } from '../components/ui/Card';
import { FilterBar } from '../components/ui/FilterBar';
import { Zap, Plus, Play, Pause, Trash2, Edit2, Bot, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { flowService } from '../services/FlowService';
import { getApiErrorMessage } from '../utils/apiError';
import { FLOW_TYPE_LABELS } from '../components/flows/flowWizardConstants';
import type { FlowRecord } from '../services/FlowService';

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const flowsList = await flowService.list();
      setFlows(flowsList);
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
      await flowService.delete(id);
      toast.success('Fluxo eliminado.');
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, 'Não foi possível eliminar o fluxo.'));
    }
  };

  const handleToggleStatus = async (flow: FlowRecord) => {
    try {
      await flowService.setActive(flow.id, !flow.is_active);
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
          subtitle="A IA escolhe qual fluxo iniciar."
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
        />

        <DataList
          data={filteredFlows}
          isLoading={loading}
          columns={[
            { header: 'Nome', accessor: 'name', className: 'font-bold text-foreground' },
            {
              header: 'Ação',
              accessor: (flow) => (
                <Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || 'interpret'] || flow.type || '—'}</Badge>
              ),
            },
            {
              header: 'Quando inicia',
              accessor: (flow) => (
                <span className="line-clamp-2 text-foreground-muted">
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
              menuAriaLabel={`Acções do fluxo ${flow.name}`}>
              <CardField
                label="Quando inicia"
                value={flow.entry_instruction?.trim() || '—'}
                className="[&_span:last-child]:line-clamp-3"
              />
              <CardField
                label="Estado"
                value={
                  <Badge variant={flow.is_active ? 'success' : 'danger'}>{flow.is_active ? 'Ativo' : 'Pausado'}</Badge>
                }
              />
              <CardField
                label="Tipo"
                icon={<Zap size={14} aria-hidden />}
                value={<Badge variant="outline">{FLOW_TYPE_LABELS[flow.type || ''] || flow.type}</Badge>}
              />
              {flow.agent?.name ? (
                <CardField label="Agente (IA)" icon={<Bot size={14} aria-hidden />} value={flow.agent.name} />
              ) : null}
              <CardField
                label="Próximo fluxo"
                icon={<GitBranch size={14} aria-hidden />}
                value={flow.next_flow_id ? flows.find((f) => f.id === flow.next_flow_id)?.name || '—' : '—'}
              />
            </DataCard>
          )}
          emptyState={
            <EmptyState
              icon={Zap}
              title="Nenhum fluxo ainda"
              description="Crie o primeiro passo da conversa no WhatsApp."
            />
          }
        />
      </div>
    </Layout>
  );
};

export default Automations;
