import type { DashboardConversationDay } from '../../types/dashboard';

type ConversationsTrendChartTooltipProps = {
  active?: boolean;
  payload?: { value?: number; payload?: DashboardConversationDay }[];
};

export function ConversationsTrendChartTooltip({
  active,
  payload,
}: ConversationsTrendChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg shadow-overlay-a15">
      <p className="text-xs text-foreground-muted">{point.payload?.label}</p>
      <p className="text-sm font-bold text-foreground">
        {(point.value ?? 0).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
