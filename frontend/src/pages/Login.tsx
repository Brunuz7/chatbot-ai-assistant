import { useState } from "react";
import api from "../services/api";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { appMeta } from "../config/appMeta";
import logo from "../assets/logo.svg";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/inicio';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.post("/api/auth/login",{
          email,
          password,
        },{
          withCredentials: true,
        },
      );

      if (response.data?.accessToken) {
        localStorage.setItem("token", response.data.accessToken);
      }

      navigate(from, { replace: true });
      
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        "Falha ao entrar. Verifique suas credenciais.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md animate-fade-in py-6">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/20 mb-3">
            <img src={logo} alt={appMeta.title} className="h-7 w-auto drop-shadow-sm" />
          </div>
        </div>

        <Card className="p-7 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Login
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Acesse sua conta para continuar.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={error ? " " : undefined} // Just highlighting the border if there's an error
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                className="text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                onClick={() => setError("Recuperação de senha em breve.")}
              >
                Esqueci minha senha
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                "Entrando..."
              ) : (
                <>
                  Entrar no Painel <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </form>

        </Card>

        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/termos-e-politicas" className="hover:text-primary hover:underline">
            Termos de Uso e Política de Privacidade
          </Link>
        </p>

        <p className="mt-0 text-center text-sm text-slate-500 dark:text-slate-400">
          Não tem uma conta?{" "}
          <Link
            to="/cadastro"
            className="text-primary font-bold hover:underline"
          >
            Cadastre-se gratuitamente
          </Link>
        </p>
      </div>
    </div>
  );
}
