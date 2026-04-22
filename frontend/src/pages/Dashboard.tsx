import React, { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import api from '../services/api';
import { 
  Wifi, 
  WifiOff, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  ExternalLink,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Modal } from '../components/ui/Modal';

const data = [
  { name: 'Seg', mensagens: 400 },
  { name: 'Ter', mensagens: 300 },
  { name: 'Qua', mensagens: 600 },
  { name: 'Qui', mensagens: 800 },
  { name: 'Sex', mensagens: 500 },
  { name: 'Sáb', mensagens: 200 },
  { name: 'Dom', mensagens: 100 },
];

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, trend: string, color: string }> = ({ icon, title, value, trend, color }) => (
  <Card>
    <div className={`${color} mb-3 p-2 bg-current/10 rounded-lg w-fit`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </div>
    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</div>
    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
    <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-2">
      <TrendingUp size={12} /> {trend}
    </div>
  </Card>
);

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    activeConversations: 0,
    messageVolume: 0,
    contactsCount: 0,
    activeAutomations: 0,
    connectionStatus: 'DISCONNECTED',
    instanceName: 'Nenhuma Instância',
    chatbotEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [modalStatus, setModalStatus] = useState<string>('Aguardando...');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await api.get('/api/metrics');
      setMetrics(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Normal polling every 30s
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(true), 30000); 
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Fast polling (every 5s) while modal is open — auto-close on CONNECTED
  useEffect(() => {
    if (isModalOpen) {
      setModalStatus('Aguardando leitura do QR Code...');
      pollingRef.current = setInterval(async () => {
        const data = await fetchMetrics(true);
        if (data?.connectionStatus === 'CONNECTED') {
          setModalStatus('Conectado com sucesso!');
          // Close modal after a brief success message
          setTimeout(() => {
            setIsModalOpen(false);
            setQrcode(null);
          }, 1500);
        } else if (data?.connectionStatus === 'CONNECTING') {
          setModalStatus('Conectando...');
        } else {
          setModalStatus('Aguardando leitura do QR Code...');
        }
      }, 5000);
    } else {
      // Clear fast polling when modal closes
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isModalOpen, fetchMetrics]);

  const handleRefresh = () => {
    fetchMetrics();
  };

  const handleManageConnection = async () => {
    setIsModalOpen(true);
    setLoadingQr(true);
    setModalStatus('Criando instância...');
    try {
      const response = await api.get('/api/instance/qrcode');
      
      if (response.data.connected) {
        setIsModalOpen(false);
        fetchMetrics();
      } else if (response.data.base64) {
        setQrcode(response.data.base64);
        setModalStatus('Aguardando leitura do QR Code...');
      }
    } catch (error: any) {
      console.error('Erro ao gerenciar conexão:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      setModalStatus(`Erro: ${errorMessage}`);
      setQrcode(null);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleToggleChatbot = async () => {
    if (metrics.connectionStatus !== 'CONNECTED') {
      alert('É necessário estar conectado para ativar o chatbot.');
      return;
    }

    const newState = !metrics.chatbotEnabled;
    try {
      setRefreshing(true);
      await api.post('/api/instance/chatbot/toggle', {
        instanceName: metrics.instanceName,
        enabled: newState
      });
      setMetrics(prev => ({ ...prev, chatbotEnabled: newState }));
    } catch (error) {
      console.error('Erro ao alternar chatbot:', error);
      alert('Falha ao alternar chatbot. Verifique os logs.');
    } finally {
      setRefreshing(false);
    }
  };

  const statusColor = metrics.connectionStatus === 'CONNECTED' 
    ? 'text-emerald-500' 
    : metrics.connectionStatus === 'CONNECTING' 
      ? 'text-amber-500' 
      : 'text-red-500';

  const statusLabel = metrics.connectionStatus === 'CONNECTED' 
    ? 'Conectado' 
    : metrics.connectionStatus === 'CONNECTING' 
      ? 'Conectando...' 
      : 'Desconectado';
  
  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo de volta! Aqui está o resumo do seu assistente.</p>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Badge variant={metrics.connectionStatus === 'CONNECTED' ? 'success' : metrics.connectionStatus === 'CONNECTING' ? 'warning' : 'danger'}>
              {refreshing && <Loader2 size={12} className="animate-spin mr-1" />}
              {metrics.connectionStatus === 'CONNECTED' ? 'Sistema Online' : metrics.connectionStatus === 'CONNECTING' ? 'Conectando...' : 'Sistema Offline'}
            </Badge>
          </div>
        </header>

        {/* Connection Status Banner */}
        <Card className={`border-l-4 transition-all duration-300 ${metrics.connectionStatus === 'CONNECTED' ? 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5' : metrics.connectionStatus === 'CONNECTING' ? 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-500/5' : 'border-l-red-500 bg-red-50/30 dark:bg-red-500/5'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full transition-colors ${metrics.connectionStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : metrics.connectionStatus === 'CONNECTING' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                {metrics.connectionStatus === 'CONNECTED' ? <Wifi size={24} /> : metrics.connectionStatus === 'CONNECTING' ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  WhatsApp: <span className={statusColor}>{statusLabel}</span>
                  {refreshing && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Instância: <span className="font-bold text-slate-700 dark:text-slate-200">{metrics.instanceName}</span>
                </p>
              </div>
            </div>
            
            {/* Chatbot Toggle */}
            <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status do Chatbot</span>
                <span className={`text-sm font-black ${metrics.chatbotEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {metrics.chatbotEnabled ? 'ATIVADO' : 'DESATIVADO'}
                </span>
              </div>
              <button
                onClick={handleToggleChatbot}
                disabled={metrics.connectionStatus !== 'CONNECTED' || refreshing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  metrics.chatbotEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                } ${metrics.connectionStatus !== 'CONNECTED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    metrics.chatbotEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={handleRefresh}
                className="gap-2"
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </Button>
              <Button 
                onClick={handleManageConnection}
                className="flex-1 md:flex-none gap-2"
                variant={metrics.connectionStatus === 'CONNECTED' ? 'outline' : 'primary'}
              >
                <ExternalLink size={18} />
                Gerenciar Conexão
              </Button>
            </div>
          </div>
        </Card>

        {/* QR Code Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Conectar WhatsApp"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Status indicator inside modal */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              modalStatus.includes('sucesso') 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : modalStatus.includes('Erro')
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
            }`}>
              {modalStatus.includes('sucesso') ? (
                <CheckCircle2 size={16} />
              ) : modalStatus.includes('Erro') ? (
                <WifiOff size={16} />
              ) : (
                <Loader2 size={16} className="animate-spin" />
              )}
              {modalStatus}
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              Escaneie o código QR abaixo com seu WhatsApp para ativar a instância.
            </p>
            
            <div className="relative w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
              {loadingQr ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <span className="text-xs text-slate-400">Gerando QR Code...</span>
                </div>
              ) : modalStatus.includes('sucesso') ? (
                <div className="flex flex-col items-center gap-3 text-emerald-500">
                  <CheckCircle2 size={64} />
                  <span className="text-sm font-bold">Conectado!</span>
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

            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleManageConnection}
                disabled={loadingQr}
              >
                <RefreshCw size={16} className={loadingQr ? 'animate-spin' : ''} />
                Atualizar QR
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<MessageSquare />} title="Conversas Ativas" value={metrics.activeConversations} trend="+12% vs ontem" color="text-blue-500" />
          <StatCard icon={<Send />} title="Volume Mensagens" value={metrics.messageVolume} trend="+5% vs ontem" color="text-emerald-500" />
          <StatCard icon={<Users />} title="Total de Contatos" value={metrics.contactsCount} trend="+3 novo hoje" color="text-amber-500" />
          <StatCard icon={<Zap />} title="Automações Ativas" value={metrics.activeAutomations} trend="Estável" color="text-indigo-500" />
        </div>

        {/* Chart Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Atividade de Mensagens (7 dias)</CardTitle>
              <Badge variant="info">Dados em Tempo Real</Badge>
            </div>
          </CardHeader>
          <div className="w-full h-80 mt-6">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Bar dataKey="mensagens" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
