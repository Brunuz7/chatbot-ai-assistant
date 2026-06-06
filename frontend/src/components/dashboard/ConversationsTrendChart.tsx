import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardConversationDay } from '../../types/dashboard';
import type { DashboardStatsPeriod } from '../../types/dashboard';
import { DashboardChartEmpty } from './DashboardChartEmpty';
import { ChartAreaSkeleton } from '../ui/Skeleton';
import { MessageSquare } from 'lucide-react';
import {
  dashboardCardClass,
  dashboardPanelMinHeightClass,
  dashboardPanelTitleClass,
} from './dashboardTheme';
import { ConversationsTrendChartTooltip } from './ConversationsTrendChartTooltip';
import { createConversationsTrendPointLabel } from './ConversationsTrendChartPointLabel';

type ConversationsTrendChartProps = {
  data: DashboardConversationDay[];
  period: DashboardStatsPeriod;
  loading?: boolean;
};

const CHART_TITLES: Record<DashboardStatsPeriod, string> = {
  day: 'Conversas nos últimos 7 dias',
  week: 'Conversas nos últimos 7 dias',
  month: 'Conversas nos últimos 30 dias',
};

export function ConversationsTrendChart({ data, period, loading }: ConversationsTrendChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const isEmpty = !loading && total === 0;
  const maxY = Math.max(...data.map((d) => d.count), 4);
  const yMax = maxY <= 10 ? Math.max(4, Math.ceil(maxY)) : Math.ceil(maxY / 400) * 400 || 400;
  const yTicks =
    maxY <= 10
      ? [0, Math.ceil(yMax / 4), Math.ceil(yMax / 2), Math.ceil((yMax * 3) / 4), yMax]
      : [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map((v) => Math.round(v));
  const uniqueTicks = [...new Set(yTicks)];

  if (!loading && isEmpty) {
    return (
      <div
        className={`${dashboardCardClass} ${dashboardPanelMinHeightClass} flex h-full w-full flex-col`}>
        <DashboardChartEmpty
          icon={MessageSquare}
          title="Nenhuma conversa registrada neste período"
          description="Quando houver atividade no WhatsApp, a evolução diária aparecerá aqui."
        />
      </div>
    );
  }

  return (
    <div className={`${dashboardCardClass} ${dashboardPanelMinHeightClass} flex h-full w-full flex-col`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={dashboardPanelTitleClass}>{CHART_TITLES[period]}</h2>
        <select
          defaultValue="day"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted outline-none focus:border-primary-a50 focus:ring-1 focus:ring-primary-a30"
          aria-label="Agrupamento do gráfico">
          <option value="day">Por dia</option>
        </select>
      </div>

      <div className="min-h-0 flex-1 w-full">
        {loading ? (
          <ChartAreaSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 28, right: 8, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-foreground-icon)' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={uniqueTicks}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--color-foreground-icon)' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => v.toLocaleString('pt-BR')}
              />
              <Tooltip content={<ConversationsTrendChartTooltip />} cursor={{ stroke: 'var(--color-primary)', strokeOpacity: 0.2 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#conversationsGradient)"
                dot={{ r: 4, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-primary-a50)', strokeWidth: 2 }}>
                <LabelList dataKey="count" content={createConversationsTrendPointLabel(data.length)} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
