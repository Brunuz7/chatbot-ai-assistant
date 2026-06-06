import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';
import { LandingChatPreview } from '../components/landing/LandingChatPreview';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { LandingFooter } from '../components/landing/LandingFooter';
import { LandingHowItWorks } from '../components/landing/LandingHowItWorks';
import { LandingTrust } from '../components/landing/LandingTrust';
import { usePageMeta } from '../hooks/usePageMeta';

const HERO_BULLETS = [
  'Fluxos de atendimento personalizados',
  'Respostas automáticas para dúvidas frequentes',
  'Acompanhamento das conversas em tempo real',
] as const;

export default function Home() {
  usePageMeta({
    title: 'Assistente Prestei — Atendimento automatizado no WhatsApp',
    description:
      'Plataforma para empresas automatizarem o atendimento ao cliente pelo WhatsApp: fluxos, dúvidas frequentes e acompanhamento de conversas.',
    canonicalUrl: 'https://app.prestei.com/',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary-a10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.22) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Início">
            <div className="rounded-xl bg-slate-900 p-2 shadow-lg">
              <img src={logo} alt="Assistente Prestei" className="h-6 w-auto" />
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="#como-funciona"
              className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-primary dark:text-slate-400 sm:inline">
              Como funciona
            </a>
            <Link
              to="/entrar"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary dark:text-slate-400">
              Login
            </Link>
            <Link to="/cadastro">
              <Button size="sm">Começar agora</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-a10 px-4 py-1.5 text-sm font-semibold text-primary">
                Atendimento inteligente
              </div>

              <div className="space-y-5">
                <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-white md:text-6xl">
                  Automatize o atendimento ao cliente{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                    pelo WhatsApp
                  </span>
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                  Nossa plataforma permite que empresas ofereçam atendimento rápido e organizado aos seus clientes, com
                  fluxos personalizados, respostas automáticas e acompanhamento das conversas.
                </p>
              </div>

              <ul className="space-y-3">
                {HERO_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={18} className="shrink-0 text-primary" aria-hidden />
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to="/cadastro">
                  <Button size="lg" className="h-12 w-full rounded-xl px-8 shadow-lg shadow-primary-a20 sm:w-auto">
                    Começar gratuitamente
                    <ArrowRight size={18} className="ml-2" aria-hidden />
                  </Button>
                </Link>
                <a href="#como-funciona">
                  <Button variant="outline" size="lg" className="h-12 w-full rounded-xl px-8 sm:w-auto">
                    Conhecer o serviço
                  </Button>
                </a>
              </div>
            </div>

            <LandingChatPreview />
          </div>
        </section>

        <LandingHowItWorks />
        <LandingFeatures />
        <LandingTrust />
      </main>

      <LandingFooter />
    </div>
  );
}
