import type { LucideIcon } from 'lucide-react';
import { Bot, MessageSquare, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { SummaryPanelSkeleton } from '../ui/Skeleton';
import {
  DASHBOARD_ICON_TONES,
  dashboardCardClass,
  dashboardPanelMinHeightClass,
  dashboardMutedTextClass,
  dashboardPanelTitleClass,
  type DashboardIconTone,
} from './dashboardTheme';
import { WhatsAppBrandIcon } from './WhatsAppBrandIcon';
import { formatNumberPt } from '../../utils/format';
import type { DashboardOverview } from '../../types/dashboard';

type SummaryRow = {
  icon: LucideIcon;
  iconTone: DashboardIconTone;
  value: string;
  label: string;
};

type PeriodSummaryPanelProps = {
  overview: DashboardOverview | null;
  loading?: boolean;
};

export function PeriodSummaryPanel({ overview, loading }: PeriodSummaryPanelProps) {
  const rows: SummaryRow[] = overview
    ? [
        {
          icon: MessageSquare,
          iconTone: 'blue',
          value: formatNumberPt(overview.summary.totalConversations),
          label: 'Conversas realizadas',
        },
        {
          icon: Users,
          iconTone: 'slate',
          value: formatNumberPt(overview.summary.uniqueContacts),
          label: 'Contatos únicos',
        },
        {
          icon: Bot,
          iconTone: 'violet',
          value: `${overview.summary.aiResolutionPercent}%`,
          label: 'Resolvidas pela IA',
        },
        {
          icon: UserPlus,
          iconTone: 'emerald',
          value: formatNumberPt(overview.summary.newContacts),
          label: 'Novos contatos',
        },
        {
          icon: AlertTriangle,
          iconTone: 'amber',
          value: formatNumberPt(overview.summary.pendingConversations),
          label: 'Conversas pendentes',
        },
      ]
    : [];

  const connected = overview?.summary.whatsappConnected ?? false;

  return (
    <aside className={`${dashboardCardClass} ${dashboardPanelMinHeightClass} flex h-full w-full flex-col`}>
      <h2 className={dashboardPanelTitleClass}>Resumo do período</h2>

      {loading ? (
        <SummaryPanelSkeleton />
      ) : (
        <>
          <ul className="mt-4 flex flex-1 flex-col gap-3.5">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${DASHBOARD_ICON_TONES[row.iconTone]}`}>
                  <row.icon size={17} strokeWidth={2} aria-hidden />
                </span>
                <p className="min-w-0 text-sm leading-snug">
                  <span className="font-bold text-foreground">{row.value}</span>
                  <span className={`font-normal ${dashboardMutedTextClass}`}> {row.label}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
            <WhatsAppBrandIcon
              className={`h-4 w-4 shrink-0 ${connected ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <span className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              Canal WhatsApp {connected ? 'conectado' : 'desconectado'}
            </span>
          </div>
        </>
      )}
    </aside>
  );
}
