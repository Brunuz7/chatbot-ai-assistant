import React from 'react';
import Layout from '../components/Layout';
import { Bot, Save, Sparkles, MessageSquare, Shield, Zap } from 'lucide-react';

const AIConfig: React.FC = () => {
  return (
    <Layout>
      <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Configuração da IA</h1>
          <p style={{ color: 'var(--text-muted)' }}>Personalize a personalidade e o comportamento do seu assistente.</p>
        </header>

        <div className="grid grid-cols-1">
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bot style={{ color: 'var(--primary)' }} />
                <h3 className="card-title">Personalidade</h3>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Comportamento Geral</label>
              <textarea 
                className="form-textarea" 
                rows={4} 
                placeholder="Ex: Você é um assistente prestativo e profissional da empresa ZapAssist. Seu tom deve ser amigável mas formal..."
                defaultValue="Você é um assistente inteligente e proativo. Seu objetivo é ajudar os clientes com dúvidas sobre nossos serviços, mantendo um tom profissional, direto e empático."
              ></textarea>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Descreva como a IA deve se apresentar e agir durante as conversas.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Regras de Resposta</label>
              <textarea 
                className="form-textarea" 
                rows={4} 
                placeholder="Ex: Nunca dê descontos acima de 10%. Sempre peça o email do cliente se ele demonstrar interesse..."
                defaultValue="- Nunca prometa prazos de entrega específicos sem consultar o sistema.&#10;- Sempre peça o nome do usuário no início da conversa.&#10;- Se não souber a resposta, peça educadamente para aguardar um atendente humano."
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ marginTop: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Zap size={20} style={{ color: 'var(--warning)' }} />
                <h4 style={{ fontWeight: 600 }}>Criatividade (Temperature)</h4>
              </div>
              <input type="range" style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Preciso</span>
                <span>Equilibrado</span>
                <span>Criativo</span>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Shield size={20} style={{ color: 'var(--success)' }} />
                <h4 style={{ fontWeight: 600 }}>Filtro de Conteúdo</h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: '0.875rem' }}>Bloquear temas sensíveis</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              <Save size={18} /> Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIConfig;
