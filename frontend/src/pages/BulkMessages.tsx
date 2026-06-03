import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import {
  Megaphone,
  Plus,
  Pause,
  Play,
  XCircle,
  Loader2,
  Info,
  Calendar,
  Users,
  Check,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { DataCard, CardField, CardActionsMenu, type CardMenuAction } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Input, Select, TextArea } from '../components/ui/Input';
import { Modal, ModalBody, ModalFloatingButton, ModalSection } from '../components/ui/Modal';
import api from '../services/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

interface LeadTagOption {
  id: string;
  name: string;
  color: string | null;
}

interface BulkLimits {
  maxRecipientsPerCampaign: number;
  maxCampaignsPerDay: number;
  maxSentPerDay: number;
  minScheduleAheadMinutes: number;
  intervalSeconds: number;
  campaignsCreatedToday: number;
  messagesSentToday: number;
}

interface BulkCampaign {
  id: string;
  name: string | null;
  message: string;
  tag_ids: string[];
  scheduled_at: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  paused_reason: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  running: 'A enviar',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  failed: 'Falhou',
};

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'running' || status === 'scheduled') return 'info';
  if (status === 'paused') return 'warning';
  if (status === 'cancelled' || status === 'failed') return 'danger';
  return 'default';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function defaultScheduleLocal(minAheadMinutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minAheadMinutes + 1);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  name: '',
  message: '',
  tagMode: 'all' as 'all' | 'tags',
  tagIds: [] as string[],
  scheduled_at: '',
};

const BulkMessages: React.FC = () => {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [tags, setTags] = useState<LeadTagOption[]>([]);
  const [limits, setLimits] = useState<BulkLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, tagsRes, limitsRes] = await Promise.all([
        api.get<BulkCampaign[]>('/api/bulk-messages'),
        api.get<LeadTagOption[]>('/api/lead-tags'),
        api.get<BulkLimits>('/api/bulk-messages/limits'),
      ]);
      setCampaigns(campRes.data ?? []);
      setTags(tagsRes.data ?? []);
      setLimits(limitsRes.data ?? null);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const openCreate = () => {
    const minAhead = limits?.minScheduleAheadMinutes ?? 5;
    setForm({
      ...emptyForm,
      scheduled_at: defaultScheduleLocal(minAhead),
    });
    setModalOpen(true);
  };

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter((id) => id !== tagId) : [...f.tagIds, tagId],
    }));
  };

  const createCampaign = async () => {
    if (!form.message.trim()) {
      toast.error('Escreva a mensagem.');
      return;
    }
    if (form.tagMode === 'tags' && form.tagIds.length === 0) {
      toast.error('Seleccione pelo menos uma classificação ou escolha todos os contatos.');
      return;
    }
    if (!form.scheduled_at) {
      toast.error('Defina data e hora de envio.');
      return;
    }

    setSaving(true);
    try {
      const scheduledIso = new Date(form.scheduled_at).toISOString();
      await api.post('/api/bulk-messages', {
        name: form.name.trim() || null,
        message: form.message.trim(),
        tag_ids: form.tagMode === 'tags' ? form.tagIds : [],
        scheduled_at: scheduledIso,
      });
      toast.success('Campanha criada. Os envios serão feitos gradualmente (~30s entre cada).');
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível criar a campanha.'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    setActionId(id);
    try {
      await api.post(`/api/bulk-messages/${id}/${action}`);
      const labels = { pause: 'pausada', resume: 'retomada', cancel: 'cancelada' };
      toast.success(`Campanha ${labels[action]}.`);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Acção falhou.'));
    } finally {
      setActionId(null);
    }
  };

  const progressPct = (c: BulkCampaign) => {
    if (c.total_recipients <= 0) return 0;
    const done = c.sent_count + c.failed_count + c.skipped_count;
    return Math.min(100, Math.round((done / c.total_recipients) * 100));
  };

  const campaignMenuActions = (c: BulkCampaign): CardMenuAction[] => {
    const busy = actionId === c.id;
    const actions: CardMenuAction[] = [];
    if (['scheduled', 'running'].includes(c.status)) {
      actions.push({
        label: 'Pausar',
        icon: busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Pause size={16} aria-hidden />,
        onClick: () => void runAction(c.id, 'pause'),
        disabled: busy,
      });
    }
    if (c.status === 'paused') {
      actions.push({
        label: 'Retomar',
        icon: busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />,
        onClick: () => void runAction(c.id, 'resume'),
        disabled: busy,
      });
    }
    if (!['completed', 'cancelled'].includes(c.status)) {
      actions.push({
        label: 'Cancelar',
        icon: <XCircle size={16} aria-hidden />,
        onClick: () => void runAction(c.id, 'cancel'),
        disabled: busy,
        variant: 'danger',
      });
    }
    return actions;
  };

  const renderCard = (c: BulkCampaign) => (
    <DataCard
      title={c.name || 'Campanha sem nome'}
      actions={campaignMenuActions(c)}
      menuAriaLabel={`Acções da campanha ${c.name || c.id}`}
    >
      <CardField
        label="Estado"
        value={<Badge variant={statusVariant(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>}
      />
      <CardField
        label="Mensagem"
        icon={<MessageSquare size={14} aria-hidden />}
        value={c.message}
        className="[&_span:last-child]:line-clamp-3"
      />
      {c.paused_reason ? (
        <CardField
          label="Motivo da pausa"
          icon={<AlertCircle size={14} aria-hidden />}
          value={<span className="text-amber-700 dark:text-amber-400">{c.paused_reason}</span>}
        />
      ) : null}
      <CardField
        label="Agendamento"
        icon={<Calendar size={14} aria-hidden />}
        value={formatDateTime(c.scheduled_at)}
      />
      <CardField
        label="Progresso"
        icon={<Users size={14} aria-hidden />}
        value={
          <span className="inline-flex w-full flex-col gap-1.5">
            <span>
              {c.sent_count}/{c.total_recipients} ({progressPct(c)}%)
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className="block h-full bg-primary transition-all"
                style={{ width: `${progressPct(c)}%` }}
              />
            </span>
          </span>
        }
      />
    </DataCard>
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={Megaphone}
          title="Envio em massa"
          subtitle="Mensagens programadas por grupo (classificação). Envio lento para reduzir risco de bloqueio."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" onClick={openCreate}>
              <Plus size={20} aria-hidden />
              Nova campanha
            </Button>
          }
        />

        {limits && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">
            <div className="flex gap-2 items-start">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Protecção anti-spam activa</p>
                <p>
                  Intervalo ~{limits.intervalSeconds}s entre envios · Máx. {limits.maxRecipientsPerCampaign}{' '}
                  destinatários/campanha · {limits.maxCampaignsPerDay} campanhas/dia ·{' '}
                  {limits.maxSentPerDay} mensagens/dia.
                </p>
                <p className="text-xs opacity-80">
                  Hoje: {limits.campaignsCreatedToday}/{limits.maxCampaignsPerDay} campanhas ·{' '}
                  {limits.messagesSentToday}/{limits.maxSentPerDay} mensagens enviadas.
                </p>
              </div>
            </div>
          </div>
        )}

        <FilterBar
          activeFiltersCount={statusFilter !== 'all' ? 1 : 0}
          onClear={() => setStatusFilter('all')}
        >
          <div className="w-full">
            <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="scheduled">Agendadas</option>
              <option value="running">A enviar</option>
              <option value="paused">Pausadas</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
            </Select>
          </div>
        </FilterBar>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            A carregar…
          </div>
        ) : (
          <DataList
            data={filtered}
            itemLabel="campanha"
            columns={[
              {
                header: 'Campanha',
                accessor: (c) => (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{c.name || 'Sem nome'}</p>
                    <p className="text-slate-500 line-clamp-1">{c.message}</p>
                  </div>
                ),
              },
              {
                header: 'Estado',
                accessor: (c) => (
                  <Badge variant={statusVariant(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
                ),
              },
              {
                header: 'Agendamento',
                accessor: (c) => (
                  <span className="text-sm text-slate-600">{formatDateTime(c.scheduled_at)}</span>
                ),
              },
              {
                header: 'Progresso',
                accessor: (c) => (
                  <span>
                    {c.sent_count}/{c.total_recipients} ({progressPct(c)}%)
                  </span>
                ),
              },
              {
                header: 'Acções',
                accessor: (c) => <CardActionsMenu actions={campaignMenuActions(c)} />,
                className: 'text-right w-14',
              },
            ]}
            renderCard={renderCard}
            emptyState={
              <div className="text-center py-16 text-slate-500">
                <Megaphone className="mx-auto mb-3 opacity-40" size={40} />
                <p className="font-medium">Nenhuma campanha</p>
                <p className="text-sm mt-1">Crie uma campanha para enviar mensagens programadas.</p>
              </div>
            }
            gridClassName="grid grid-cols-1 lg:grid-cols-2 gap-4"
          />
        )}

        <Modal
          variant="form"
          pageWidth="xl"
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Nova campanha"
          subtitle="Os envios são processados um a um, com intervalo de segurança."
          icon={Megaphone}
          floatingAction={
            <ModalFloatingButton type="submit" form="bulk-campaign-form" disabled={saving}>
              {saving ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Check size={18} strokeWidth={2.25} aria-hidden />
              )}
              {saving ? 'Salvando…' : 'Agendar campanha'}
            </ModalFloatingButton>
          }
        >
          <ModalBody>
            <form
              id="bulk-campaign-form"
              onSubmit={(e) => {
                e.preventDefault();
                void createCampaign();
              }}
            >
            <ModalSection>
              <Select
                label="Grupo"
                value={form.tagMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tagMode: e.target.value as 'all' | 'tags',
                    tagIds: e.target.value === 'all' ? [] : f.tagIds,
                  }))
                }
              >
                <option value="all">Todos os contatos activos</option>
                <option value="tags">Por classificação (uma ou mais)</option>
              </Select>
              {form.tagMode === 'tags' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-slate-500">Crie classificações em Classificação de contatos.</p>
                  ) : (
                    tags.map((t) => {
                      const selected = form.tagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTag(t.id)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                          style={selected && t.color ? { borderColor: t.color, color: t.color } : undefined}
                        >
                          {t.name}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </ModalSection>

            <ModalSection>
              <Input
                label="Nome (opcional)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Promoção maio"
              />
              <TextArea
                label="Texto"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={5}
                placeholder="Olá! Temos uma novidade para si..."
                className="mt-3"
              />
            </ModalSection>

            <ModalSection>
              <Input
                label="Início do envio"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-2">
                Mínimo {limits?.minScheduleAheadMinutes ?? 5} minutos à frente. Cada mensagem sai com ~
                {limits?.intervalSeconds ?? 30}s de intervalo.
              </p>
            </ModalSection>
            </form>
          </ModalBody>
        </Modal>
      </div>
    </Layout>
  );
};

export default BulkMessages;
