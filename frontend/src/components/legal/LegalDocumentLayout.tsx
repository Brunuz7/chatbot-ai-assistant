import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo.svg';

type LegalDocumentLayoutProps = {
  title: string;
  lastUpdated: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function LegalDocumentLayout({ title, lastUpdated, footer, children }: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} aria-hidden />
            Início
          </Link>
          <Link to="/" className="bg-slate-900 p-1.5 rounded-lg" aria-label="Início">
            <img src={logo} alt="Assistente Prestei" className="h-5 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 not-prose">
            Documento legal
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 not-prose mb-10">
            Última atualização: {lastUpdated}
          </p>
          {children}
        </article>
      </main>

      {footer ? (
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
