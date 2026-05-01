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
  { name: 'Dom', mensagens: 100 }
];

const StatCard = ({ icon, title, value, trend, color }: any) => (
  <Card>
    <div className={`${color} mb-3 p-2 bg-current/10 rounded-lg w-fit`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>

    <div className="text-sm text-slate-500">{title}</div>

    <div className="text-2xl font-bold mt-1">{value}</div>

    <div className="text-xs text-emerald-500 flex gap-1 mt-2">
      <TrendingUp size={12} />
      {trend}
    </div>
  </Card>
);

const Dashboard = () => {
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
  const [modalStatus, setModalStatus] = useState('Aguardando...');

  const pollingRef = useRef<any>(null);

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    try {
      const response = await api.get('/api/metrics');
      setMetrics(response.data);
      return response.data;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  useEffect(() => {
    if (isModalOpen) {
      pollingRef.current = setInterval(async () => {
        const data = await fetchMetrics(true);

        if (data?.connectionStatus === 'CONNECTED') {
          setModalStatus('Conectado com sucesso!');

          setTimeout(() => {
            setIsModalOpen(false);
            setQrcode(null);
          }, 1500);
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isModalOpen, fetchMetrics]);

  const handleRefresh = () => {
    fetchMetrics();
  };

  const handleManageConnection = async () => {
    setQrcode(null); // ALTERAÇÃO
    setIsModalOpen(true);
    setLoadingQr(true);
    setModalStatus('Gerando QR Code...');

    try {
      const response = await api.get('/api/instance/qrcode');

      if (response.data.connected) {
        setIsModalOpen(false);
        fetchMetrics();
      } else if (response.data.base64) {
        setQrcode(response.data.base64);
        setModalStatus('Escaneie o QR Code');
      }
    } catch (error: any) {
      setModalStatus('Erro ao gerar QR Code');
      console.log(error);
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">

        {/* HEADER */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-500">
              Resumo do sistema
            </p>
          </div>

          <Button onClick={handleRefresh}>
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
          </Button>
        </header>

        {/* STATUS */}
        <Card>
          <div className="flex justify-between items-center">

            <div className="flex items-center gap-4">

              {metrics.connectionStatus === 'CONNECTED' ? (
                <Wifi key="wifi-on" size={28} className="text-green-500" />
              ) : (
                <WifiOff
                  key="wifi-off"
                  size={28}
                  className="text-red-500"
                />
              )}

              <div>
                <h3 className="font-bold">
                  WhatsApp: {metrics.connectionStatus}
                </h3>

                <p className="text-sm text-slate-500">
                  {metrics.instanceName}
                </p>
              </div>
            </div>

            <Button onClick={handleManageConnection}>
              <ExternalLink size={18} />
              Gerenciar
            </Button>

          </div>
        </Card>

        {/* CARDS */}
        <div className="grid grid-cols-4 gap-6">

          <StatCard
            icon={<MessageSquare />}
            title="Conversas"
            value={metrics.activeConversations}
            trend="+12%"
            color="text-blue-500"
          />

          <StatCard
            icon={<Send />}
            title="Mensagens"
            value={metrics.messageVolume}
            trend="+5%"
            color="text-green-500"
          />

          <StatCard
            icon={<Users />}
            title="Contatos"
            value={metrics.contactsCount}
            trend="+3"
            color="text-yellow-500"
          />

          <StatCard
            icon={<Zap />}
            title="Bots"
            value={metrics.activeAutomations}
            trend="Estável"
            color="text-purple-500"
          />

        </div>

        {/* GRÁFICO */}
        <Card>

          <CardHeader>
            <CardTitle>Mensagens da Semana</CardTitle>
          </CardHeader>

          <div className="w-full h-80">

            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin" />
              </div>
            ) : (

              // ALTERAÇÃO IMPORTANTE
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="mensagens"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>

            )}

          </div>

        </Card>

        {/* MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Conectar WhatsApp"
        >
          <div className="space-y-6 text-center">

            <p>{modalStatus}</p>

            <div className="w-64 h-64 mx-auto border rounded-xl flex justify-center items-center">

              {loadingQr ? (
                <Loader2
                  key="loading"
                  className="animate-spin"
                  size={42}
                />
              ) : qrcode ? (
                <img
                  src={qrcode}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              ) : modalStatus.includes('sucesso') ? (
                <CheckCircle2
                  key="success"
                  size={60}
                  className="text-green-500"
                />
              ) : (
                <WifiOff
                  key="error"
                  size={60}
                  className="text-red-500"
                />
              )}

            </div>

            <Button
              onClick={handleManageConnection}
              disabled={loadingQr}
            >
              Atualizar QR
            </Button>

          </div>
        </Modal>

      </div>
    </Layout>
  );
};

export default Dashboard;