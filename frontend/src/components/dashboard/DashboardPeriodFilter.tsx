import type { DashboardStatsPeriod } from '../../types/dashboard';

const STATS_PERIODS: { id: DashboardStatsPeriod; label: string }[] = [
  { id: 'day', label: 'Hoje' },
  { id: 'week', label: '7 dias' },
  { id: 'month', label: '30 dias' },
];

type DashboardPeriodFilterProps = {
  value: DashboardStatsPeriod;
  onChange: (period: DashboardStatsPeriod) => void;
  disabled?: boolean;
};

export function DashboardPeriodFilter({ value, onChange, disabled }: DashboardPeriodFilterProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface-muted p-1"
      role="group"
      aria-label="Período do painel">
      {STATS_PERIODS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(id)}
          className={[
            'rounded-md px-4 py-1.5 text-sm font-semibold transition-all disabled:opacity-60',
            value === id
              ? 'bg-primary text-foreground-inverse shadow-sm'
              : 'text-foreground-muted hover:text-foreground',
          ].join(' ')}>
          {label}
        </button>
      ))}
    </div>
  );
}
