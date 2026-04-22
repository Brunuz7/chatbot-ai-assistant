import { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Zap, BarChart3, Bot } from 'lucide-react';

export default function Home() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.get('/api/health/db');
        if (res.data.status === 'connected') {
          setDbStatus('connected');
        } else {
          setDbStatus('disconnected');
        }
      } catch (err) {
        setDbStatus('disconnected');
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', width: '100%' }}>
      {/* Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 4rem',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
          <MessageSquare size={28} />
          <span>ZapAssist</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Login</Link>
          <Link to="/register" className="btn btn-primary">Começar Agora</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ padding: '6rem 2rem', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
          <Zap size={16} />
          A nova geração de automação no WhatsApp
        </div>
        
        <h1 style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--text)' }}>
          Transforme seu WhatsApp em uma <span style={{ color: 'var(--primary)' }}>máquina de vendas</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem' }}>
          Assistente inteligente com IA que atende, qualifica e vende 24h por dia. 
          Integrado com Evolution API para máxima performance.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Teste Grátis por 7 dias
          </Link>
          <button className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Ver Demonstração
          </button>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3" style={{ marginTop: '6rem', gap: '2rem' }}>
          <div className="card" style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><Bot size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>IA Avançada</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Treine seu assistente com sua própria base de conhecimento.</p>
          </div>
          <div className="card" style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><Zap size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>Fluxos Ágeis</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Crie automações complexas com drag & drop simplificado.</p>
          </div>
          <div className="card" style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><BarChart3 size={32} /></div>
            <h3 style={{ marginBottom: '0.5rem' }}>Métricas Reais</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Acompanhe conversões e volume de mensagens em tempo real.</p>
          </div>
        </div>

        {/* DB Status Badge */}
        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center' }}>
          <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: dbStatus === 'connected' ? 'var(--success)' : 'var(--danger)',
              boxShadow: dbStatus === 'connected' ? '0 0 10px var(--success)' : 'none'
            }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Status do Servidor: {dbStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
