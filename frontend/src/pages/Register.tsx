import { useState } from 'react';
import { toast } from 'sonner';
import { authService } from '../services/AuthService';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput, PhoneInput, Select } from '../components/ui/Input';
import { normalizePhoneDigits, DEFAULT_PHONE_INPUT_VALUE } from '../utils/phoneMask';
import { Card } from '../components/ui/Card';
import { COMPANY_SEGMENTS } from '../constants/companySegments';
import { getApiErrorMessage } from '../utils/apiError';
import logo from '../assets/logo.svg';

export default function Register() {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySegment, setCompanySegment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_PHONE_INPUT_VALUE);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }
    if (!companySegment) {
      toast.error('Selecione o segmento da empresa.');
      return;
    }
    const phone = normalizePhoneDigits(phoneNumber);
    if (phone && (phone.length < 12 || phone.length > 13)) {
      toast.error('Informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.register({
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        company_segment: companySegment,
        phone_number: phone || undefined,
        email: email.trim(),
        password,
      });
      authService.persistAccessToken(data.accessToken);
      toast.success('Conta criada com sucesso.');
      navigate('/inicio');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha no cadastro.'));
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

      <div className="w-full max-w-2xl animate-fade-in py-6">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/20 mb-3">
            <img src={logo} alt="Assistente Prestei" className="h-7 w-auto drop-shadow-sm" />
          </div>
        </div>

        <Card className="p-7 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Criar conta</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie sua conta para começar.</p>
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
                required>
                <option value="" disabled>
                  Selecione…
                </option>
                {COMPANY_SEGMENTS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <PhoneInput
              label="Telefone"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="+55 (75) 98333-1375"
              autoComplete="tel"
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
              <PasswordInput
                label="Senha"
                placeholder="Crie uma senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <PasswordInput
                label="Repita"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-1">
              Ao cadastrar, você declara ter lido os{' '}
              <Link to="/termos-e-politicas" className="text-primary font-semibold hover:underline">
                Termos de Uso e Política de Privacidade
              </Link>
              .
            </p>

            <div className="flex justify-center pt-1">
              <Button type="submit" className="w-full max-w-[280px] h-11 text-sm font-semibold" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Já possui uma conta?{' '}
          <Link to="/entrar" className="text-primary font-bold hover:underline">
            Fazer login agora
          </Link>
        </p>
      </div>
    </div>
  );
}
