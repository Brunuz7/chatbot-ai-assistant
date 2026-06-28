import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listPublicPlans } from '@plans';
import { Button } from '../ui/Button';
import { LandingSectionHeader } from './LandingSectionHeader';

const PLANS = listPublicPlans();

export function LandingPricing() {
  return (
    <section id="planos" className="border-t border-slate-200/80 bg-slate-50/80 px-6 py-20 dark:border-slate-800 dark:bg-slate-900/40 md:py-28">
      <div className="mx-auto max-w-6xl space-y-14">
        <LandingSectionHeader
          eyebrow="Planos"
          title="Escolha o plano ideal para sua operação"
          description="Todos os planos incluem conexão com WhatsApp, fluxos de atendimento e suporte da plataforma. Escale conforme sua equipe cresce."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${
                plan.highlighted
                  ? 'border-primary shadow-lg shadow-primary-a10 ring-2 ring-primary/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}>
              {plan.highlighted ? (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  <Sparkles size={12} aria-hidden />
                  Mais popular
                </div>
              ) : null}

              <div className="mb-6 space-y-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{plan.name}</h3>
                {plan.subtitle ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{plan.subtitle}</p>
                ) : null}
                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{plan.priceLabel}</span>
                  {plan.priceCents !== null ? (
                    <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">/mês</span>
                  ) : null}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span>
                      {feature.kind === 'limit' ? (
                        feature.value === null ? (
                          <>{feature.label} ilimitados</>
                        ) : (
                          <>
                            <strong className="font-semibold">{feature.displayValue}</strong>{' '}
                            {feature.label.toLowerCase()}
                          </>
                        )
                      ) : (
                        feature.label
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Link to="/cadastro" className="mt-auto">
                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  className="h-11 w-full rounded-xl font-semibold">
                  {plan.id === 'exclusivo' ? 'Falar com consultor' : 'Começar agora'}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
