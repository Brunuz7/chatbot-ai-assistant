import { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { appMeta } from '../config/appMeta';
import logo from '../assets/logo.svg';
import { Sparkles, UserPlus } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', response.data.accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Falha no cadastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/20 mb-4">
            <img src={logo} alt={appMeta.title} className="h-8 w-auto" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Junte-se a milhares de empresas que automatizam com IA</p>
        </div>

        <Card className="p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar sua conta</h2>
            <Sparkles size={18} className="text-amber-500" />
          </div>
          
          <form onSubmit={submit} className="space-y-5">
            <Input 
              label="Nome Completo"
              type="text"
              placeholder="Seu nome"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
            />

            <Input 
              label="E-mail Corporativo"
              type="email"
              placeholder="seu@empresa.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
            
            <Input 
              label="Senha"
              type="password" 
              placeholder="Crie uma senha forte"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />

            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <input type="checkbox" className="mt-1" required />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Ao se cadastrar, você concorda com nossos <a href="#" className="text-primary font-semibold underline">Termos de Uso</a> e <a href="#" className="text-primary font-semibold underline">Política de Privacidade</a>.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Criando Conta...' : (
                <>
                  Criar Conta Grátis <UserPlus size={18} className="ml-2" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Já possui uma conta?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Fazer login agora
          </Link>
        </p>
      </div>
    </div>
  );
}
