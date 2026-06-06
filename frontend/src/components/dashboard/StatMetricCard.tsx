import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatMetricCardSkeleton } from '../ui/Skeleton';
import {
  DASHBOARD_ICON_GREEN_TONE,
  DASHBOARD_ICON_TONES,
  dashboardCardClass,
  dashboardMutedTextClass,
  type DashboardIconTone,
} from './dashboardTheme';
import { StatMetricTrendLine } from './StatMetricTrendLine';

type IconTone = DashboardIconTone | 'green';

type StatMetricCardProps = {
  icon?: LucideIcon;
  iconNode?: ReactNode;
  iconTone?: IconTone;
  title: string;
  value: ReactNode;
  changePercent?: number | null;
  comparisonLabel?: string;
  invertTrendColors?: boolean;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
  /** Métricas numéricas usam tamanho grande; status (ex.: WhatsApp) usa `sm`. */
  valueSize?: 'default' | 'sm';
};

export function StatMetricCard({
  icon: Icon,
  iconNode,
  iconTone = 'blue',
  title,
  value,
  changePercent,
  comparisonLabel = 'vs período anterior',
  invertTrendColors,
  footer,
  loading,
  className = '',
  valueSize = 'default',
}: StatMetricCardProps) {
  const valueClassName =
    valueSize === 'sm'
      ? 'mt-1 text-base font-semibold leading-tight'
      : 'mt-1 text-[1.75rem] font-bold leading-none tabular-nums tracking-tight text-foreground';
  const toneClass =
    iconTone === 'green' ? DASHBOARD_ICON_GREEN_TONE : DASHBOARD_ICON_TONES[iconTone];

  if (loading) {
    return (
      <article className={`${dashboardCardClass} ${className}`}>
        <StatMetricCardSkeleton />
      </article>
    );
  }

  return (
    <article className={`${dashboardCardClass} ${className}`}>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          {iconNode ??
            (Icon ? <Icon size={20} strokeWidth={2} className="text-white" aria-hidden /> : null)}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-tight ${dashboardMutedTextClass}`}>{title}</p>

          <div className={valueClassName}>{value}</div>

          {changePercent !== undefined ? (
            <StatMetricTrendLine
              value={changePercent ?? 0}
              comparisonLabel={comparisonLabel}
              invertTrendColors={invertTrendColors}
            />
          ) : null}

          {footer ? <div className="mt-1.5">{footer}</div> : null}
        </div>
      </div>
    </article>
  );
}
