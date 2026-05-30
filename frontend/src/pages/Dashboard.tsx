import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";

import Layout from "../components/Layout";

import { Card, CardHeader, CardTitle } from "../components/ui/Card";

import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";

import api from "../services/api";

import {
  Wifi,
  WifiOff,
  MessageSquare,
  Send,
  Users,
  Zap,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock3,
  ShieldCheck,
  BarChart3,
  Bot,
  Sparkles,
  ServerCrash,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

interface DashboardData {
  activeConversations: number;
  messageVolume: number;
  contactsCount: number;
  activeAutomations: number;
  connectionStatus: string;
  instanceName: string;
  chatbotEnabled: boolean;
  blockedContacts: number;
  todayMessages: number;
  weekMessages: number;
  averageResponseTime: string;
  systemStatus: string;
  chartData: {
    name: string;
    mensagens: number;
  }[];
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardData>({
    activeConversations: 0,
    messageVolume: 0,
    contactsCount: 0,
    activeAutomations: 0,
    connectionStatus: "DISCONNECTED",
    instanceName: "Nenhuma",
    chatbotEnabled: false,
    blockedContacts: 0,
    todayMessages: 0,
    weekMessages: 0,
    averageResponseTime: "0s",
    systemStatus: "OFFLINE",
    chartData: [],
  });

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [qrcode, setQrcode] = useState<string | null>(null);

  const [loadingQr, setLoadingQr] = useState(false);

  const [modalStatus, setModalStatus] = useState("Aguardando...");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
  ====================================
  STATUS
  ====================================
  */
  const statusConfig = useMemo(() => {
    switch (metrics.connectionStatus) {
      case "CONNECTED":
        return {
          label: "Conectado",
          color: "text-emerald-400",
          badge: "success",
          bg: "from-emerald-500/20 to-emerald-500/5",
          icon: Wifi,
        };

      case "CONNECTING":
        return {
          label: "Conectando...",
          color: "text-amber-400",
          badge: "warning",
          bg: "from-amber-500/20 to-amber-500/5",
          icon: Loader2,
        };

      default:
        return {
          label: "Desconectado",
          color: "text-red-400",
          badge: "danger",
          bg: "from-red-500/20 to-red-500/5",
          icon: WifiOff,
        };
    }
  }, [metrics.connectionStatus]);

  /*
  ====================================
  FETCH DASHBOARD
  ====================================
  */
  const fetchDashboard = useCallback(async () => {
    try {
      setRefreshing(true);

      const response = await api.get("/api/dashboard/overview");

      setMetrics(response.data);
    } catch (error) {
      console.error("Erro dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
  ====================================
  INITIAL LOAD
  ====================================
  */
  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  /*
  ====================================
  QR MODAL POLLING
  ====================================
  */
  useEffect(() => {
    if (!isModalOpen) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get("/api/instance/status");

        if (response.data.connectionStatus === "CONNECTED") {
          setModalStatus("Conectado com sucesso!");

          setTimeout(() => {
            setIsModalOpen(false);
            setQrcode(null);

            fetchDashboard();
          }, 1500);
        }
      } catch (error) {
        console.error(error);
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isModalOpen, fetchDashboard]);

  /*
  ====================================
  GERENCIAR CONEXÃO
  ====================================
  */
  const handleManageConnection = async () => {
    try {
      setLoadingQr(true);

      setModalStatus("Gerando QR Code...");

      setIsModalOpen(true);

      const response = await api.get("/api/instance/qrcode");

      if (response.data.connected) {
        setModalStatus("Instância já conectada");

        fetchDashboard();

        return;
      }

      setQrcode(response.data.base64);
    } catch (error: any) {
      setModalStatus(error?.response?.data?.error || "Erro ao gerar QR");
    } finally {
      setLoadingQr(false);
    }
  };

  /*
  ====================================
  CHATBOT TOGGLE
  ====================================
  */
  const handleToggleChatbot = async () => {
    try {
      await api.post("/api/instance/chatbot/toggle", {
        instanceName: metrics.instanceName,

        enabled: !metrics.chatbotEnabled,
      });

      fetchDashboard();
    } catch (error) {
      console.error(error);
    }
  };

  /*
  ====================================
  CARDS
  ====================================
  */
  const stats = [
    {
      title: "Conversas Ativas",
      value: metrics.activeConversations,
      icon: MessageSquare,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      trend: "+12%",
    },

    {
      title: "Mensagens Hoje",
      value: metrics.todayMessages,
      icon: Send,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      trend: "+8%",
    },

    {
      title: "Contatos",
      value: metrics.contactsCount,
      icon: Users,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      trend: "+3",
    },

    {
      title: "Bloqueados",
      value: metrics.blockedContacts,
      icon: ShieldCheck,
      color: "text-red-400",
      bg: "bg-red-500/10",
      trend: "-2",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-cyan-500 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />

                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Sistema Inteligente
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white leading-tight">
                  Dashboard
                </h1>

                <p className="text-slate-400 mt-3 max-w-2xl">
                  Controle completo do seu chatbot, conexões, métricas,
                  mensagens e automações em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={statusConfig.badge as any}>
                  {statusConfig.label}
                </Badge>

                <Badge variant="info">{metrics.systemStatus}</Badge>

                <Badge variant="success">{metrics.averageResponseTime}</Badge>
              </div>
            </div>

            {/* STATUS CARD */}
            <div
              className={`w-full max-w-sm rounded-3xl border border-slate-800 bg-gradient-to-br ${statusConfig.bg} p-6 backdrop-blur-xl`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Status WhatsApp</p>

                  <h3
                    className={`text-2xl font-black mt-2 ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </h3>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-700">
                  <statusConfig.icon size={28} className={statusConfig.color} />
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Instância</span>

                  <span className="text-white font-semibold">
                    {metrics.instanceName}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Chatbot</span>

                  <span
                    className={`font-bold ${
                      metrics.chatbotEnabled
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {metrics.chatbotEnabled ? "ATIVADO" : "DESATIVADO"}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  variant="primary"
                  onClick={handleManageConnection}
                >
                  <ExternalLink size={16} />
                  Conectar
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={fetchDashboard}
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((item, index) => {
            const Icon = item.icon;

            return (
              <Card
                key={index}
                className="relative overflow-hidden border border-slate-800 bg-slate-900/60 backdrop-blur-xl hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-2xl ${item.bg}`}>
                      <Icon size={24} className={item.color} />
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <TrendingUp size={12} />
                      {item.trend}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-slate-400 text-sm">{item.title}</p>

                    <h2 className="text-4xl font-black text-white mt-2">
                      {item.value}
                    </h2>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* CHARTS */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* CHART */}
          <Card className="xl:col-span-2 border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Atividade de Mensagens</CardTitle>

                  <p className="text-sm text-slate-400 mt-1">Últimos 7 dias</p>
                </div>

                <Badge variant="info">Tempo Real</Badge>
              </div>
            </CardHeader>

            <div className="h-[350px] mt-6">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-cyan-400" size={40} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.chartData}>
                    <defs>
                      <linearGradient
                        id="colorMensagens"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#06b6d4"
                          stopOpacity={0.5}
                        />

                        <stop
                          offset="95%"
                          stopColor="#06b6d4"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />

                    <XAxis dataKey="name" stroke="#64748b" />

                    <YAxis stroke="#64748b" />

                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: 16,
                        color: "#fff",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="mensagens"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorMensagens)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* SIDE */}
          <div className="space-y-6">
            <Card className="border border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>

              <div className="space-y-5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10">
                      <Activity size={18} className="text-cyan-400" />
                    </div>

                    <span className="text-slate-300">Sistema</span>
                  </div>

                  <span className="text-emerald-400 font-bold">Online</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10">
                      <Bot size={18} className="text-violet-400" />
                    </div>

                    <span className="text-slate-300">Chatbot</span>
                  </div>

                  <span
                    className={`font-bold ${
                      metrics.chatbotEnabled
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {metrics.chatbotEnabled ? "Ativo" : "Desativado"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                      <Clock3 size={18} className="text-amber-400" />
                    </div>

                    <span className="text-slate-300">Resposta Média</span>
                  </div>

                  <span className="text-white font-bold">
                    {metrics.averageResponseTime}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle>Chatbot</CardTitle>
              </CardHeader>

              <div className="space-y-5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>

                  <button
                    onClick={handleToggleChatbot}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${
                      metrics.chatbotEnabled ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        metrics.chatbotEnabled
                          ? "translate-x-8"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center gap-2">
                    {metrics.chatbotEnabled ? (
                      <CheckCircle2 className="text-emerald-400" size={18} />
                    ) : (
                      <ServerCrash className="text-red-400" size={18} />
                    )}

                    <span className="text-sm text-slate-300">
                      {metrics.chatbotEnabled
                        ? "Chatbot operando normalmente"
                        : "Chatbot desativado"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* QR MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Conectar WhatsApp"
        >
          <div className="space-y-6">
            <div className="text-center">
              <Badge variant="info">{modalStatus}</Badge>
            </div>

            <div className="flex justify-center">
              <div className="w-72 h-72 rounded-3xl border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                {loadingQr ? (
                  <Loader2 className="animate-spin text-cyan-400" size={42} />
                ) : qrcode ? (
                  <img
                    src={qrcode}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <WifiOff size={60} className="text-slate-700" />
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleManageConnection}
              >
                Atualizar QR
              </Button>

              <Button className="flex-1" onClick={() => setIsModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default Dashboard;
