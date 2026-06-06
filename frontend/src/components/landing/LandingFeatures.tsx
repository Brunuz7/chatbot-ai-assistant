import { LANDING_FEATURES } from '../../constants/homeLanding';
import { LandingSectionHeader } from './LandingSectionHeader';

export function LandingFeatures() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <LandingSectionHeader
          eyebrow="Funcionalidades"
          title="Tudo o que sua equipe precisa para atender melhor"
          description="Ferramentas práticas para organizar conversas, responder com consistência e acompanhar resultados."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-a10 text-primary transition-transform group-hover:scale-105">
                <feature.icon size={22} aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
