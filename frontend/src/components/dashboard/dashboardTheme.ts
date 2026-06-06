/** Tokens do painel Início — seguem `index.css` (light + GitHub Primer dark). */
export const dashboardCardClass = 'rounded-2xl border border-border bg-surface p-5';

/** Altura mínima partilhada pelos painéis do gráfico e resumo (mesma linha da grelha). */
export const dashboardPanelMinHeightClass = 'min-h-[320px]';

export const dashboardPanelTitleClass = 'text-sm font-semibold text-foreground';

export const dashboardMutedTextClass = 'text-foreground-muted';

export type DashboardIconTone = 'blue' | 'violet' | 'emerald' | 'sky' | 'amber' | 'slate';

export const DASHBOARD_ICON_TONES: Record<DashboardIconTone, string> = {
  blue: 'bg-primary text-foreground-inverse',
  violet: 'bg-violet-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  sky: 'bg-sky-600 text-white',
  amber: 'bg-amber-600 text-white',
  slate: 'bg-slate-600 text-white',
};

export const DASHBOARD_ICON_GREEN_TONE = 'bg-emerald-600 text-white';

export const COMPARISON_LABELS: Record<'day' | 'week' | 'month', string> = {
  day: 'vs ontem',
  week: 'vs 7 dias anteriores',
  month: 'vs 30 dias anteriores',
};

export function formatPercentTrend(value: number): string {
  const abs = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (value > 0) return `↑ ${abs}%`;
  if (value < 0) return `↓ ${abs}%`;
  return `${abs}%`;
}
