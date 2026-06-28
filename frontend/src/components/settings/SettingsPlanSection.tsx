import { Check, Crown } from 'lucide-react';
import type { UserPlanSummary } from '../../types/plan';
import { SettingsPanelCard } from './SettingsPanelCard';

type SettingsPlanSectionProps = {
  plan: UserPlanSummary | null;
  loading: boolean;
};

const LIMIT_LABELS: Record<keyof UserPlanSummary['usage'], string> = {
  agents: 'Agentes',
  flows: 'Fluxos de atendimento',
  knowledge_bases: 'Bases de conhecimento',
};

function formatUsage(used: number, limit: number | null): string {
  if (limit === null) return `${used} (ilimitado)`;
  return `${used} de ${limit}`;
}

export function SettingsPlanSection({ plan, loading }: SettingsPlanSectionProps) {
  if (loading) {
    return (
      <SettingsPanelCard title="Plano" description="Carregando informações do plano…">
        <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
      </SettingsPanelCard>
    );
  }

  if (!plan) {
    return (
      <SettingsPanelCard title="Plano" description="Não foi possível carregar o plano atual.">
        <p className="text-sm text-foreground-muted">Tente recarregar a página.</p>
      </SettingsPanelCard>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsPanelCard
        title="Plano atual"
        description="Recursos e limites incluídos na sua assinatura.">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-surface-hover/40 p-5">
          <div>
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-primary" aria-hidden />
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            </div>
            {plan.subtitle ? <p className="mt-1 text-sm text-foreground-muted">{plan.subtitle}</p> : null}
            <p className="mt-3 text-2xl font-black text-foreground">
              {plan.priceLabel}
              {plan.priceCents !== null ? (
                <span className="ml-1 text-sm font-medium text-foreground-muted">/mês</span>
              ) : null}
            </p>
          </div>
          {plan.id === 'exclusivo' ? (
            <span className="rounded-full bg-primary-a10 px-3 py-1 text-xs font-semibold text-primary">
              Atendimento exclusivo
            </span>
          ) : null}
        </div>
      </SettingsPanelCard>

      <SettingsPanelCard title="Uso do plano" description="Quantidade utilizada em relação ao limite contratado.">
        <dl className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(LIMIT_LABELS) as Array<keyof UserPlanSummary['usage']>).map((key) => {
            const limit = plan.limits[key];
            const used = plan.usage[key];
            const atLimit = limit !== null && used >= limit;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 ${atLimit ? 'border-warning/40 bg-warning-muted/30' : 'border-border'}`}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {LIMIT_LABELS[key]}
                </dt>
                <dd className="mt-1 text-lg font-bold text-foreground">{formatUsage(used, limit)}</dd>
              </div>
            );
          })}
        </dl>
      </SettingsPanelCard>

      <SettingsPanelCard title="Funcionalidades incluídas" description="Recursos disponíveis no seu plano.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {plan.features.map((feature) => (
            <li
              key={feature.key}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <Check size={16} className="shrink-0 text-primary" aria-hidden />
              {feature.kind === 'limit' ? `${feature.label}: ${feature.displayValue}` : feature.label}
            </li>
          ))}
        </ul>
        {plan.id !== 'exclusivo' ? (
          <p className="mt-4 text-sm text-foreground-muted">
            Precisa de mais recursos ou atendimento exclusivo? Entre em contacto para conhecer o plano EXCLUSIVO.
          </p>
        ) : null}
      </SettingsPanelCard>
    </div>
  );
}
