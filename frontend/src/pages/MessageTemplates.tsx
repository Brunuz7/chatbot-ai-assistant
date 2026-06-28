import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import {
  FileText,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Plus,
} from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { EmptyState } from '../components/ui/EmptyState';
import { DataCard, CardField } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { templateService } from '../services/TemplateService';
import { connectionService } from '../services/ConnectionService';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTimePt } from '../utils/format';
import type { WhatsAppTemplate } from '../types/whatsappTemplate';
import type { WhatsappChannel } from '../types/connection';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

const componentSummary = (components: unknown): string => {
  if (!Array.isArray(components)) return '';
  const parts: string[] = [];
  for (const raw of components) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    if (c.type === 'HEADER') {
      const format = String(c.format ?? 'TEXT');
      parts.push(format === 'TEXT' ? 'Cabeçalho texto' : `Cabeçalho ${format.toLowerCase()}`);
    }
    if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
      parts.push(`${c.buttons.length} botão${c.buttons.length === 1 ? '' : 'ões'}`);
    }
  }
  return parts.join(' · ');
};

const MessageTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [channel, setChannel] = useState<WhatsappChannel>('evolution');
  const [officialConnected, setOfficialConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        connectionService.getOverview(),
        templateService.list({ sync }),
      ]);
      setChannel(overview.whatsapp_channel);
      setOfficialConnected(overview.official.connected);
      setTemplates(list);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  const hasPending = useMemo(() => templates.some((t) => t.status === 'PENDING'), [templates]);

  useEffect(() => {
    if (!hasPending || channel !== 'official' || !officialConnected) return;
    const interval = setInterval(() => void load(true), 30_000);
    return () => clearInterval(interval);
  }, [hasPending, channel, officialConnected, load]);

  const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'danger';
    return 'warning';
  };

  const statusIcon = (status: string) => {
    if (status === 'APPROVED') return <CheckCircle2 size={14} aria-hidden />;
    if (status === 'REJECTED') return <XCircle size={14} aria-hidden />;
    return <Clock size={14} aria-hidden />;
  };

  const manualSync = async () => {
    setSyncing(true);
    try {
      await load(true);
      toast.success('Estados actualizados.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Falha ao sincronizar.'));
    } finally {
      setSyncing(false);
    }
  };

  const canCreate = channel === 'official' && officialConnected;
  const summary = (t: WhatsAppTemplate) => componentSummary(t.components);

  const renderCard = (t: WhatsAppTemplate) => (
    <DataCard title={t.name}>
      <CardField
        label="Estado"
        value={
          <Badge variant={statusVariant(t.status)}>
            <span className="inline-flex items-center gap-1">
              {statusIcon(t.status)}
              {STATUS_LABELS[t.status] ?? t.status}
            </span>
          </Badge>
        }
      />
      <CardField label="Categoria" value={t.category} />
      <CardField label="Mensagem" icon={<FileText size={14} aria-hidden />} value={t.body} className="[&_span:last-child]:line-clamp-3" />
      {summary(t) ? <CardField label="Componentes" value={summary(t)} /> : null}
      {t.footer ? <CardField label="Rodapé" value={t.footer} /> : null}
      {t.rejection_reason ? (
        <CardField
          label="Motivo da rejeição"
          icon={<XCircle size={14} aria-hidden />}
          value={<span className="text-red-700 dark:text-red-400">{t.rejection_reason}</span>}
        />
      ) : null}
      <CardField label="Criado em" value={formatDateTimePt(t.created_at)} />
    </DataCard>
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={FileText}
          title="Templates WhatsApp"
          subtitle="Crie modelos aprovados pela Meta para enviar campanhas."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                to="/campanhas"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary-a10 sm:h-auto sm:w-auto">
                <ArrowLeft size={18} aria-hidden />
                Campanhas
              </Link>
              {hasPending ? (
                <Button
                  variant="outline"
                  className="h-11 w-full gap-2 sm:h-auto sm:w-auto"
                  onClick={() => void manualSync()}
                  disabled={syncing || loading}>
                  {syncing ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <RefreshCw size={18} aria-hidden />}
                  Actualizar estados
                </Button>
              ) : null}
              {canCreate ? (
                <Link
                  to="/campanhas/templates/novo"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover sm:h-auto sm:w-auto">
                  <Plus size={18} aria-hidden />
                  Novo template
                </Link>
              ) : (
                <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto" disabled>
                  <Plus size={18} aria-hidden />
                  Novo template
                </Button>
              )}
            </div>
          }
        />

        {channel !== 'official' || !officialConnected ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="flex gap-2 items-start">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">API oficial necessária</p>
                <p>
                  Templates são geridos pela Meta e só estão disponíveis com o canal WhatsApp Oficial conectado.
                  Configure em{' '}
                  <Link to="/configuracoes" className="underline hover:text-primary">
                    Configurações
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4 text-sm text-foreground-muted">
            <div className="flex gap-2 items-start">
              <Clock size={18} className="shrink-0 mt-0.5 text-primary" />
              <p>
                Depois de criar, a Meta analisa o template. Pode demorar até 24 h. Esta página actualiza sozinha
                enquanto houver templates pendentes.
              </p>
            </div>
          </div>
        )}

        <DataList
          data={loading ? [] : templates}
          isLoading={loading}
          columns={[
            {
              header: 'Template',
              accessor: (t) => (
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-foreground-muted line-clamp-1">{t.body}</p>
                  {summary(t) ? <p className="text-xs text-foreground-muted mt-0.5">{summary(t)}</p> : null}
                </div>
              ),
            },
            {
              header: 'Estado',
              accessor: (t) => (
                <Badge variant={statusVariant(t.status)}>{STATUS_LABELS[t.status] ?? t.status}</Badge>
              ),
            },
            {
              header: 'Categoria',
              accessor: (t) => <span className="text-foreground-muted">{t.category}</span>,
            },
            {
              header: 'Criado',
              accessor: (t) => <span className="text-foreground-muted">{formatDateTimePt(t.created_at)}</span>,
            },
          ]}
          renderCard={renderCard}
          emptyState={
            <EmptyState
              icon={FileText}
              title="Nenhum template"
              description="Crie um template com cabeçalho, botões ou mídia para campanhas na API oficial."
            />
          }
          gridClassName="grid grid-cols-1 lg:grid-cols-2 gap-4"
        />
      </div>
    </Layout>
  );
};

export default MessageTemplates;
