import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import { COMPANY_CNPJ, COMPANY_EMAIL } from '../../constants/contact';

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <img src={logo} alt="Assistente Prestei" className="h-6 w-auto" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Assistente Prestei</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Atendimento automatizado no WhatsApp</p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Plataforma SaaS para empresas que desejam organizar, automatizar e acompanhar o atendimento ao cliente pelo
            WhatsApp.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/termos-e-politicas" className="font-medium text-slate-600 hover:text-primary dark:text-slate-300">
                  Termos e Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/entrar" className="font-medium text-slate-600 hover:text-primary dark:text-slate-300">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/cadastro" className="font-medium text-slate-600 hover:text-primary dark:text-slate-300">
                  Criar conta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contato</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-primary">
                  {COMPANY_EMAIL}
                </a>
              </li>
              <li>CNPJ {COMPANY_CNPJ}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-slate-100 px-6 pt-6 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} Assistente Prestei. Todos os direitos reservados.
      </div>
    </footer>
  );
}
