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
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField, CardActionsMenu, type CardMenuAction } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Input, Select, TextArea } from '../components/ui/Input';
import { ModalForm, ModalBody, ModalSection } from '../components/ui/Modal';
import { bulkMessageService } from '../services/BulkMessageService';
import { tagService } from '../services/TagService';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTimePt, defaultDateTimeLocalValue } from '../utils/format';
import { bulkCampaignStatusVariant } from '../utils/bulkMessage';
import type { BulkCampaign, BulkLimits } from '../types/bulkMessage';
import type { TagOption } from '../types/tag';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  running: 'A enviar',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  failed: 'Falhou',
};

const emptyForm = {
  name: '',
  message: '',
  tagMode: 'all' as 'all' | 'tags',
  tagIds: [] as string[],
  scheduled_at: '',
};

const BulkMessages: React.FC = () => {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
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
      const [campaignList, tagList, limitsData] = await Promise.all([
        bulkMessageService.listCampaigns(),
        tagService.list(),
        bulkMessageService.getLimits(),
      ]);
      setCampaigns(campaignList);
      setTags(tagList);
      setLimits(limitsData ?? null);
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
      scheduled_at: defaultDateTimeLocalValue(minAhead),
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
      await bulkMessageService.createCampaign({
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
      await bulkMessageService.runAction(id, action);
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
      menuAriaLabel={`Acções da campanha ${c.name || c.id}`}>
      <CardField
        label="Estado"
        value={<Badge variant={bulkCampaignStatusVariant(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>}
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
      <CardField label="Agendamento" icon={<Calendar size={14} aria-hidden />} value={formatDateTimePt(c.scheduled_at)} />
      <CardField
        label="Progresso"
        icon={<Users size={14} aria-hidden />}
        value={
          <span className="inline-flex w-full flex-col gap-1.5">
            <span>
              {c.sent_count}/{c.total_recipients} ({progressPct(c)}%)
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="block h-full bg-primary transition-all" style={{ width: `${progressPct(c)}%` }} />
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
          subtitle="Campanhas por classificação, com envio gradual."
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
                <p className="font-medium">Proteção anti-spam ativa</p>
                <p>
                  Intervalo ~{limits.intervalSeconds}s entre envios · Máx. {limits.maxRecipientsPerCampaign}{' '}
                  destinatários/campanha · {limits.maxCampaignsPerDay} campanhas/dia · {limits.maxSentPerDay}{' '}
                  mensagens/dia.
                </p>
                <p className="text-xs opacity-80">
                  Hoje: {limits.campaignsCreatedToday}/{limits.maxCampaignsPerDay} campanhas ·{' '}
                  {limits.messagesSentToday}/{limits.maxSentPerDay} mensagens enviadas.
                </p>
              </div>
            </div>
          </div>
        )}

        <FilterBar>
          <FilterBar.Chips
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'scheduled', label: 'Agendadas' },
              { value: 'running', label: 'A enviar' },
              { value: 'paused', label: 'Pausadas' },
              { value: 'completed', label: 'Concluídas' },
              { value: 'cancelled', label: 'Canceladas' },
            ]}
            aria-label="Estado da campanha"
          />
        </FilterBar>

        <DataList
            data={loading ? [] : filtered}
            isLoading={loading}
            columns={[
              {
                header: 'Campanha',
                accessor: (c) => (
                  <div>
                    <p className="font-medium text-foreground">{c.name || 'Sem nome'}</p>
                    <p className="text-foreground-muted line-clamp-1">{c.message}</p>
                  </div>
                ),
              },
              {
                header: 'Estado',
                accessor: (c) => <Badge variant={bulkCampaignStatusVariant(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>,
              },
              {
                header: 'Agendamento',
                accessor: (c) => <span className="text-foreground-muted">{formatDateTimePt(c.scheduled_at)}</span>,
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
              <EmptyState
                icon={Megaphone}
                title="Nenhuma campanha"
                description="Crie uma campanha para enviar mensagens programadas aos seus contatos."
              />
            }
            gridClassName="grid grid-cols-1 lg:grid-cols-2 gap-4"
          />

        <ModalForm
          formId="bulk-campaign-form"
          submitDisabled={saving}
          submitLoading={saving}
          submitLabel={saving ? 'Salvando…' : 'Agendar campanha'}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Nova campanha"
          subtitle="Envio gradual, um a um."
          icon={Megaphone}>
          <ModalBody>
            <form
              id="bulk-campaign-form"
              onSubmit={(e) => {
                e.preventDefault();
                void createCampaign();
              }}>
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
                  }>
                  <option value="all">Todos os contatos ativos</option>
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
                                ? 'border-primary bg-primary-a10 text-primary'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                            style={selected && t.color ? { borderColor: t.color, color: t.color } : undefined}>
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
        </ModalForm>
      </div>
    </Layout>
  );
};

export default BulkMessages;
