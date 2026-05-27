import { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Zap, BarChart3, Bot, ArrowRight, CheckCircle2 } from 'lucide-react';
import { appMeta } from '../config/appMeta';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl shadow-lg">
            <img src={logo} alt={appMeta.title} className="h-6 w-auto" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/entrar" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            Login
          </Link>
          <Link to="/cadastro">
            <Button size="sm">Começar Agora</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-20 pb-32 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold animate-fade-in">
            <Zap size={16} />
            <span>A nova geração de automação no WhatsApp</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            Transforme seu WhatsApp em uma <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">máquina de vendas</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Assistente inteligente com IA que atende, qualifica e vende 24h por dia. 
            Integrado com a API oficial do WhatsApp (Meta) para máxima conformidade e escala.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/cadastro">
              <Button className="h-14 px-10 text-lg rounded-2xl shadow-xl shadow-primary/20 group">
                Teste Grátis por 7 dias
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" className="h-14 px-10 text-lg rounded-2xl bg-white dark:bg-slate-900">
              Ver Demonstração
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
            {[
              { icon: <Bot size={32} />, title: 'IA Avançada', desc: 'Treine seu assistente com sua própria base de conhecimento.' },
              { icon: <Zap size={32} />, title: 'Fluxos Ágeis', desc: 'Crie automações complexas com nosso construtor simplificado.' },
              { icon: <BarChart3 size={32} />, title: 'Métricas Reais', desc: 'Acompanhe conversões e volume de mensagens em tempo real.' }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group">
                <div className="text-primary mb-6 group-hover:scale-110 transition-transform origin-left">{f.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="pt-20 flex justify-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'
              }`}></div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Status do Servidor: {dbStatus === 'loading' ? 'Verificando...' : dbStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} {appMeta.siteName}</p>
          <Link
            to="/termos-e-politicas"
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Termos de Uso e Política de Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
