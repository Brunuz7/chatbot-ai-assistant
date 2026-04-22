import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Share2, Link2, ExternalLink, ShieldCheck, Power, Settings2, WifiOff } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

const Integrations: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const integrations = [
    { 
      id: 'evolution', 
      name: 'Evolution API', 
      description: 'Conexão principal com WhatsApp via Evolution API v2.',
      status: 'connected',
      icon: <Link2 size={24} />,
      color: '#2563eb'
    },
    { 
      id: 'openai', 
      name: 'OpenAI (GPT-4o)', 
      description: 'Cérebro da inteligência artificial para respostas automáticas.',
      status: 'connected',
      icon: <ShieldCheck size={24} />,
      color: '#10a37f'
    },
    { 
      id: 'webhooks', 
      name: 'Webhooks', 
      description: 'Integre com sistemas externos (CRM, ERP, etc).',
      status: 'disconnected',
      icon: <ExternalLink size={24} />,
      color: '#64748b'
    }
  ];

  const handleConnect = async (id: string) => {
    if (id !== 'evolution') return;

    setIsModalOpen(true);
    setLoadingQr(true);
    try {
      const response = await api.get('/api/instance/qrcode');
      if (response.data.connected) {
        setIsModalOpen(false);
        window.open('http://localhost:8080', '_blank');
      } else if (response.data.base64) {
        setQrcode(response.data.base64);
      }
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Erro na Conexão: ${errorMessage}`);
      setQrcode(null);
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Integrações</h1>
          <p style={{ color: 'var(--text-muted)' }}>Conecte seu assistente às suas ferramentas favoritas.</p>
        </header>

        <div className="grid grid-cols-2">
          {integrations.map((int) => (
            <div key={int.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '12px', 
                    background: `${int.color}15`, 
                    color: int.color 
                  }}>
                    {int.icon}
                  </div>
                  <span className={`badge ${int.status === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                    {int.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>{int.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  {int.description}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={() => handleConnect(int.id)}
                >
                  {int.status === 'connected' ? 'Configurar' : 'Conectar'}
                </button>
                {int.status === 'connected' && (
                  <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)30' }}>
                    <Power size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add custom integration card */}
          <div className="card" style={{ borderStyle: 'dashed', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}><Share2 size={32} /></div>
              <p style={{ fontWeight: 600 }}>Solicitar Nova Integração</p>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Conectar Evolution API"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <p className="text-slate-500 dark:text-slate-400">
            Escaneie o código QR abaixo para ativar sua conexão.
          </p>
          
          <div className="relative w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
            {loadingQr ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <span className="text-xs text-slate-400">Gerando QR Code...</span>
              </div>
            ) : qrcode ? (
              <img src={qrcode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <WifiOff size={48} className="mb-2 opacity-20" />
                <span className="text-sm">Falha ao carregar</span>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsModalOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default Integrations;
