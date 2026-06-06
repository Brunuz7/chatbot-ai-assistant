import { LANDING_DATA_POINTS, LANDING_STEPS } from '../../constants/homeLanding';
import { LandingSectionHeader } from './LandingSectionHeader';

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="border-y border-slate-200/80 bg-slate-50/80 py-24 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mx-auto max-w-6xl px-6">
        <LandingSectionHeader
          eyebrow="O serviço"
          title="Como a plataforma ativa o atendimento em nome dos seus clientes"
          description="Empresas utilizam o Assistente Prestei para automatizar conversas no WhatsApp. Os dados da plataforma são empregados exclusivamente para executar esse serviço."
        />

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {LANDING_STEPS.map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-4xl font-black text-primary-a25 dark:text-primary-a40">{item.step}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Serviço prestado</h3>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
              Nossa plataforma permite que empresas automatizem o atendimento ao cliente pelo WhatsApp. Os clientes
              utilizam o serviço para criar fluxos de atendimento, responder dúvidas frequentes, fornecer informações
              sobre produtos e serviços e acompanhar interações realizadas pelo canal.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
              Os dados são usados apenas para executar os serviços solicitados pelos clientes e melhorar a gestão de
              suas comunicações.
            </p>
          </div>

          <div className="rounded-3xl border border-primary/15 bg-primary-a5 p-8 dark:bg-primary-a7">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dados utilizados</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Informações recebidas pela plataforma são tratadas com finalidade específica:
            </p>
            <ul className="mt-6 space-y-4">
              {LANDING_DATA_POINTS.map((point) => (
                <li key={point.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-slate-900">
                    <point.icon size={18} aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{point.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {point.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
