import { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, PhoneInput, Select } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { appMeta } from '../config/appMeta';
import logo from '../assets/logo.svg';
export default function Register() {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySegment, setCompanySegment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    if (!companySegment) {
      setError('Selecione o segmento da empresa.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/register', {
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        company_segment: companySegment,
        phone_number: phoneNumber || undefined,
        email: email.trim(),
        password,
      });
      localStorage.setItem('token', response.data.accessToken);
      navigate('/inicio');
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-2xl animate-fade-in py-6">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/20 mb-3">
            <img src={logo} alt={appMeta.title} className="h-7 w-auto drop-shadow-sm" />
          </div>
        </div>

        <Card className="p-7 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Criar conta
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Crie sua conta para começar.
            </p>
          </div>
          
          <form onSubmit={submit} className="space-y-3">
            <Input
              label="Nome"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Empresa"
                type="text"
                placeholder="Nome da empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
              />

              <Select
                label="Segmento da empresa"
                value={companySegment}
                onChange={(e) => setCompanySegment(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecione…
                </option>
                <option value="agencia_marketing">Agência / Marketing</option>
                <option value="clinica_saude">Clínica / Saúde</option>
                <option value="consultoria_servicos">Consultoria / Serviços</option>
                <option value="educacao_cursos">Educação / Cursos</option>
                <option value="ecommerce">E-commerce</option>
                <option value="imobiliaria">Imobiliária</option>
                <option value="restaurante_alimentacao">Restaurante / Alimentação</option>
                <option value="varejo_loja">Varejo / Loja</option>
                <option value="outros">Outros</option>
              </Select>
            </div>

            <PhoneInput
              label="Telefone"
              value={phoneNumber}
              onChange={setPhoneNumber}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Senha"
                type="password"
                placeholder="Crie uma senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                label="Repita"
                type="password"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center">
                {error}
              </div>
            )}

            <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-1">
              Ao cadastrar, você declara ter lido os{' '}
              <Link to="/termos-e-politicas" className="text-primary font-semibold hover:underline">
                Termos de Uso e Política de Privacidade
              </Link>
              .
            </p>

            <div className="flex justify-center pt-1">
              <Button
                type="submit"
                className="w-full max-w-[280px] h-11 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-0 text-center text-sm text-slate-500 dark:text-slate-400">
          Já possui uma conta?{' '}
          <Link to="/entrar" className="text-primary font-bold hover:underline">
            Fazer login agora
          </Link>
        </p>
      </div>
    </div>
  );
}
