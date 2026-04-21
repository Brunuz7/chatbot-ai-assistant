import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', { email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'failed');
    }
  }

  return (
    <div className="auth">
      <h2>Registrar</h2>
      <form onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">Criar conta</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
