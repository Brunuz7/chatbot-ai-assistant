import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { StatMetricCard } from '../components/dashboard/StatMetricCard';
import { ConversationsTrendChart } from '../components/dashboard/ConversationsTrendChart';
import { PeriodSummaryPanel } from '../components/dashboard/PeriodSummaryPanel';
import { DashboardPeriodFilter } from '../components/dashboard/DashboardPeriodFilter';
import { WhatsAppBrandIcon } from '../components/dashboard/WhatsAppBrandIcon';
import { WhatsAppConnectionPanel } from '../components/connection/WhatsAppConnectionPanel';
import { COMPARISON_LABELS } from '../components/dashboard/dashboardTheme';
import { useAuthProfile } from '../contexts/AuthProfileContext';
import { dashboardService } from '../services/DashboardService';
import { buildUserGreeting } from '../utils/greeting';
import { formatNumberPt } from '../utils/format';
import { AlertTriangle, Bot, Mail, MessageSquare, Users } from 'lucide-react';
import type { DashboardOverview, DashboardStatsPeriod } from '../types/dashboard';

const PERIOD_LABELS: Record<DashboardStatsPeriod, { conversations: string; messages: string }> = {
  day: { conversations: 'Conversas hoje', messages: 'Mensagens hoje' },
  week: { conversations: 'Conversas (7 dias)', messages: 'Mensagens (7 dias)' },
  month: { conversations: 'Conversas (30 dias)', messages: 'Mensagens (30 dias)' },
};

const Dashboard: React.FC = () => {
  const { profile } = useAuthProfile();
  const [period, setPeriod] = useState<DashboardStatsPeriod>('day');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const pageTitle = buildUserGreeting(profile?.name, profile?.email);

  const fetchOverview = useCallback(async (p: DashboardStatsPeriod, options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const data = await dashboardService.getOverview(p, { force: options?.force });
      setOverview(data);
    } catch (error) {
      console.error('Erro ao buscar painel:', error);
      setOverview(null);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  const refreshAfterConnectionChange = useCallback(() => {
    void fetchOverview(period, { silent: true, force: true });
  }, [fetchOverview, period]);

  useEffect(() => {
    void fetchOverview(period);
  }, [period, fetchOverview]);

  const labels = PERIOD_LABELS[period];
  const comparisonLabel = COMPARISON_LABELS[period];
  const whatsappConnected = overview?.whatsapp.connected ?? false;

  return (
    <Layout>
      <div className="animate-fade-in space-y-5">
        <PageHeader
          title={pageTitle}
          subtitle="Resumo do atendimento."
        />

        <WhatsAppConnectionPanel onOverviewChange={refreshAfterConnectionChange} />

        <div className="flex justify-end">
          <DashboardPeriodFilter value={period} onChange={setPeriod} disabled={loading} />
        </div>

        <section
          aria-label="Indicadores principais"
          className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatMetricCard
            icon={MessageSquare}
            iconTone="blue"
            title={labels.conversations}
            value={formatNumberPt(overview?.conversationsCount ?? 0)}
            changePercent={overview?.conversationsChangePercent}
            comparisonLabel={comparisonLabel}
            loading={loading}
          />
          <StatMetricCard
            icon={Bot}
            iconTone="violet"
            title="Resoluções pela IA"
            value={`${overview?.aiResolutionPercent ?? 0}%`}
            changePercent={overview?.aiResolutionChangePercent}
            comparisonLabel={comparisonLabel}
            loading={loading}
          />
          <StatMetricCard
            icon={Users}
            iconTone="emerald"
            title="Novos contatos"
            value={formatNumberPt(overview?.newContactsCount ?? 0)}
            changePercent={overview?.newContactsChangePercent}
            comparisonLabel={comparisonLabel}
            loading={loading}
          />
          <StatMetricCard
            icon={Mail}
            iconTone="sky"
            title={labels.messages}
            value={formatNumberPt(overview?.messagesCount ?? 0)}
            changePercent={overview?.messagesChangePercent}
            comparisonLabel={comparisonLabel}
            loading={loading}
          />
          <StatMetricCard
            icon={AlertTriangle}
            iconTone="amber"
            title="Pendências"
            value={formatNumberPt(overview?.pendingCount ?? 0)}
            changePercent={overview?.pendingChangePercent}
            comparisonLabel={comparisonLabel}
            invertTrendColors
            loading={loading}
          />
          <StatMetricCard
            iconTone="green"
            valueSize="sm"
            iconNode={<WhatsAppBrandIcon className="h-5 w-5 text-white" />}
            title="Canal WhatsApp"
            value={
              <span
                className={`inline-flex items-center gap-1.5 ${whatsappConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${whatsappConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
                  aria-hidden
                />
                {overview?.whatsapp.statusLabel ?? '—'}
              </span>
            }
            footer={
              !loading ? (
                <p className="text-xs leading-none text-foreground-muted">
                  {whatsappConnected ? (
                    'Tudo funcionando corretamente'
                  ) : (
                    <Link to="/configuracoes" className="font-medium text-primary hover:underline">
                      Configurar conexão
                    </Link>
                  )}
                </p>
              ) : null
            }
            loading={loading}
          />
        </section>

        <section
          aria-label="Gráfico e resumo"
          className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <div className="flex lg:col-span-2">
            <ConversationsTrendChart
              data={overview?.conversationsByDay ?? []}
              period={period}
              loading={loading}
            />
          </div>
          <div className="flex lg:col-span-1">
            <PeriodSummaryPanel overview={overview} loading={loading} />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;
