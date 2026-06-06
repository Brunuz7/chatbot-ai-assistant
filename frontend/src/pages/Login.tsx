import { useState } from 'react';
import { toast } from 'sonner';
import { authService } from '../services/AuthService';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { getApiErrorMessage } from '../utils/apiError';
import logo from '../assets/logo.svg';
import { ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/inicio';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.login(email, password);

      if (data.accessToken) authService.persistAccessToken(data.accessToken);

      navigate(from, { replace: true });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Não foi possível entrar. Verifique suas credenciais.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-a5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md animate-fade-in py-6">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/20 mb-3">
            <img src={logo} alt="Assistente Prestei" className="h-7 w-auto drop-shadow-sm" />
          </div>
        </div>

        <Card className="p-7 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Login</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PasswordInput
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                onClick={() => toast.info('Recuperação de senha em breve.')}>
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                'Entrando...'
              ) : (
                <>
                  Entrar no Painel <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Não tem uma conta?{' '}
          <Link to="/cadastro" className="text-primary font-bold hover:underline">
            Cadastre-se gratuitamente
          </Link>
        </p>
      </div>
    </div>
  );
}
