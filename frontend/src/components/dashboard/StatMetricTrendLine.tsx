import { dashboardMutedTextClass, formatPercentTrend } from './dashboardTheme';

type StatMetricTrendLineProps = {
  value: number;
  comparisonLabel: string;
  invertTrendColors?: boolean;
};

export function StatMetricTrendLine({
  value,
  comparisonLabel,
  invertTrendColors,
}: StatMetricTrendLineProps) {
  const up = value > 0;
  const down = value < 0;
  const positive = invertTrendColors ? down : up;
  const negative = invertTrendColors ? up : down;
  const trendClass = positive
    ? 'text-emerald-500'
    : negative
      ? 'text-red-500'
      : 'text-foreground-muted';

  return (
    <p className="mt-1.5 text-xs leading-none">
      <span className={`font-medium ${trendClass}`}>{formatPercentTrend(value)}</span>
      <span className={`font-normal ${dashboardMutedTextClass}`}> {comparisonLabel}</span>
    </p>
  );
}
