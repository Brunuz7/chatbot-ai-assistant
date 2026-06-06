import { Link } from 'react-router-dom';
import { Lock, Shield } from 'lucide-react';
import { LandingSectionHeader } from './LandingSectionHeader';

export function LandingTrust() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <LandingSectionHeader
          eyebrow="Conformidade"
          title="Uso responsável e transparente dos dados"
          description="Operamos em conformidade com as políticas da Meta e com as leis aplicáveis de proteção de dados."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Shield size={22} aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Políticas da Meta</h3>
            <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
              O serviço é oferecido em integração com o WhatsApp Business, respeitando as diretrizes comerciais e de
              mensagens exigidas pela Meta.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-a10 text-primary">
              <Lock size={22} aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Proteção de dados</h3>
            <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
              Os dados da plataforma são utilizados somente para prestar o serviço contratado por cada empresa. Não
              vendemos informações pessoais.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Consulte nossos{' '}
          <Link to="/termos-e-politicas" className="font-semibold text-primary hover:underline">
            Termos de Uso e Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
