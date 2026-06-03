import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { PageHeader } from "../components/PageHeader";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal, ModalBody, ModalSection } from "../components/ui/Modal";
import api from "../services/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "../utils/apiError";
import { OfficialWhatsAppWizard } from "../components/whatsapp/OfficialWhatsAppWizard";
import type { ConnectionOverview, WhatsappChannel } from "../types/connection";

import {
  Wifi,
  WifiOff,
  MessageSquare,
  Send,
  Users,
  Zap,
  ExternalLink,
  Cloud,
  RefreshCw,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock3,
  ShieldCheck,
  Bot,
  Sparkles,
  ServerCrash,
  Workflow,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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

const QUICK_LINKS = [
  { to: "/contatos", label: "Contatos", icon: Users, description: "Lista e conversas" },
  { to: "/agentes", label: "Agentes", icon: Bot, description: "Assistentes de IA" },
  { to: "/fluxos", label: "Fluxos", icon: Workflow, description: "Fluxos de atendimento" },
] as const;

const Dashboard: React.FC = () => {
  /*
  ====================================
  STATES & REFS
  ====================================
  */
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
  const [refreshing, setRefreshing] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfficialWizardOpen, setIsOfficialWizardOpen] = useState(false);
  const [connectionOverview, setConnectionOverview] = useState<ConnectionOverview | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [modalStatus, setModalStatus] = useState("Aguardando...");
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
  ====================================
  STATUS CONFIG (UI)
  ====================================
  */
  const activeStatus = connectionOverview?.active.connectionStatus ?? metrics.connectionStatus;

  const statusConfig = useMemo(() => {
    switch (activeStatus) {
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
  }, [activeStatus]);

  /*
  ====================================
  FETCH DATA FUNCTIONS
  ====================================
  */
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get("/api/dashboard/overview");
      setMetrics(response.data);
    } catch (error) {
      console.error("Erro ao carregar métricas do dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnectionOverview = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await api.get<ConnectionOverview>("/api/connection/overview");
      setConnectionOverview(response.data);
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar conexão:", error);
      return null;
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const fetchEvolutionStatus = useCallback(async () => {
    try {
      const response = await api.get("/api/instance/status");
      setConnectionOverview((prev) =>
        prev
          ? {
              ...prev,
              evolution: {
                ...prev.evolution,
                connectionStatus: response.data.connectionStatus,
                instanceName: response.data.instanceName,
                chatbotEnabled: response.data.chatbotEnabled,
                connected: response.data.connectionStatus === "CONNECTED",
              },
            }
          : prev
      );
      return response.data;
    } catch {
      return null;
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchConnectionOverview(true)]);
    setRefreshing(false);
  }, [fetchDashboard, fetchConnectionOverview]);

  useEffect(() => {
    void handleRefreshAll();
    const interval = setInterval(() => {
      void fetchDashboard();
    }, 15000);
    return () => clearInterval(interval);
  }, [handleRefreshAll, fetchDashboard]);

  /*
  ====================================
  QR MODAL POLLING
  ====================================
  */
  useEffect(() => {
    if (isModalOpen) {
      setModalStatus("Aguardando leitura do QR Code...");
      pollingRef.current = setInterval(async () => {
        const data = await fetchEvolutionStatus();
        if (data?.connectionStatus === "CONNECTED") {
          setModalStatus("Conectado com sucesso!");
          setTimeout(() => {
            setIsModalOpen(false);
            setQrcode(null);
            void fetchConnectionOverview(true);
            void fetchDashboard();
          }, 1500);
        }
      }, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isModalOpen, fetchEvolutionStatus, fetchConnectionOverview, fetchDashboard]);

  /*
  ====================================
  INTERACTIONS & HANDLERS
  ====================================
  */
  const handleSetChannel = async (next: WhatsappChannel) => {
    if (connectionOverview?.whatsapp_channel === next || savingChannel) return;
    setSavingChannel(true);
    try {
      const res = await api.patch<{ overview: ConnectionOverview }>("/api/connection/channel", {
        channel: next,
      });
      setConnectionOverview(res.data.overview);
      toast.success(
        next === "official"
          ? "Canal ativo: WhatsApp Oficial (Cloud API)."
          : "Canal ativo: Evolution (QR)."
      );
      void fetchDashboard();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Não foi possível alterar o canal."));
    } finally {
      setSavingChannel(false);
    }
  };

  const handleManageConnection = async () => {
    setLoadingQr(true);
    setModalStatus("Gerando QR Code...");
    setIsModalOpen(true);
    try {
      const response = await api.get("/api/instance/qrcode");
      if (response.data.connected) {
        setModalStatus("Instância já conectada");
        setIsModalOpen(false);
        void handleRefreshAll();
        return;
      } else if (response.data.base64) {
        setQrcode(response.data.base64);
        setModalStatus("Aguardando leitura do QR Code...");
      }
    } catch (error: any) {
      console.error("Erro ao gerenciar conexão:", error);
      const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      setModalStatus(`Erro: ${errorMessage}`);
      setQrcode(null);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleToggleChatbot = async () => {
    const isChannelConnected = connectionOverview?.active.connected ?? (metrics.connectionStatus === "CONNECTED");
    if (!isChannelConnected) {
      toast.error("Conecte o WhatsApp no canal selecionado antes de ativar o chatbot.");
      return;
    }

    const currentChatbotState = connectionOverview?.active.chatbotEnabled ?? metrics.chatbotEnabled;
    const newState = !currentChatbotState;
    
    setRefreshing(true);
    try {
      await api.post("/api/connection/chatbot/toggle", { enabled: newState });
      await handleRefreshAll();
    } catch (error) {
      console.error("Erro ao alternar chatbot:", error);
      toast.error(getApiErrorMessage(error, "Falha ao alternar chatbot."));
    } finally {
      setRefreshing(false);
    }
  };

  const channel = connectionOverview?.whatsapp_channel ?? "evolution";
  const activeConnected = connectionOverview?.active.connected === true || metrics.connectionStatus === "CONNECTED";
  const chatbotOn = connectionOverview?.active.chatbotEnabled ?? metrics.chatbotEnabled;
  const activeLabel = connectionOverview?.active.instanceName ?? metrics.instanceName;

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
        
        {/* ==================================== */}
        {/* HERO HEADER                          */}
        {/* ==================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#071024] to-slate-950 p-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-cyan-500 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Sistema Inteligente
                </span>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white leading-tight">Dashboard</h1>
                <p className="text-slate-400 mt-3 max-w-2xl">
                  Controle completo do seu chatbot, conexões, métricas, mensagens e automações em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={statusConfig.badge as any}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="info">Sistema: {metrics.systemStatus}</Badge>
                <Badge variant="success">Latência: {metrics.averageResponseTime}</Badge>
              </div>
            </div>

            <div>
              <Button variant="outline" className="gap-2 bg-slate-900/60 backdrop-blur-md border-slate-800" onClick={handleRefreshAll} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                Sincronizar
              </Button>
            </div>
          </div>
        </section>

        {/* ==================================== */}
        {/* CHANNEL MANAGER SECTION              */}
        {/* ==================================== */}
        <Card className={`border-l-4 transition-all duration-300 ${
          activeStatus === "CONNECTED"
            ? "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5"
            : activeStatus === "CONNECTING"
              ? "border-l-amber-500 bg-amber-50/30 dark:bg-amber-500/5"
              : "border-l-red-500 bg-red-50/30 dark:bg-red-500/5"
        }`}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Canal de WhatsApp em uso
              </p>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800" role="group">
                <button
                  type="button"
                  disabled={savingChannel || refreshing}
                  onClick={() => void handleSetChannel("evolution")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    channel === "evolution" ? "bg-white text-primary shadow-sm dark:bg-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <Wifi size={14} /> Evolution (QR)
                </button>
                <button
                  type="button"
                  disabled={savingChannel || refreshing}
                  onClick={() => void handleSetChannel("official")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    channel === "official" ? "bg-white text-primary shadow-sm dark:bg-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <Cloud size={14} /> API Oficial
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full transition-colors ${
                  activeStatus === "CONNECTED" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20" : activeStatus === "CONNECTING" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20" : "bg-red-100 text-red-600 dark:bg-red-500/20"
                }`}>
                  {channel === "official" ? <Cloud size={24} /> : activeStatus === "CONNECTED" ? <Wifi size={24} /> : activeStatus === "CONNECTING" ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {channel === "official" ? "WhatsApp Oficial" : "WhatsApp Evolution"}:{" "}
                    <span className={statusConfig.color}>{statusConfig.label}</span>
                    {refreshing && <Loader2 size={16} className="animate-spin text-slate-400" />}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {channel === "official" ? "Número" : "Instância"}:{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{activeLabel}</span>
                  </p>
                  {connectionOverview && (
                    <p className="text-xs text-slate-500 mt-1">
                      {channel === "evolution" ? (
                        connectionOverview.official.connected ? "API Oficial também configurada (inativa)." : "API Oficial ainda não configurada."
                      ) : connectionOverview.evolution.connected ? "Evolution (QR) também conectado (inativo)." : "Evolution (QR) não conectado."}
                    </p>
                  )}
                </div>
              </div>

              {/* TOGGLE CHATBOT REALTIME */}
              <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chatbot Ativo</span>
                <button
                  type="button"
                  onClick={() => void handleToggleChatbot()}
                  disabled={!activeConnected || refreshing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    chatbotOn ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  } ${!activeConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${chatbotOn ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                {channel === "evolution" ? (
                  <Button onClick={handleManageConnection} className="flex-1 md:flex-none gap-2" variant={connectionOverview?.evolution.connected ? "outline" : "primary"}>
                    <ExternalLink size={18} />
                    {connectionOverview?.evolution.connected ? "Gerenciar QR" : "Conectar via QR"}
                  </Button>
                ) : (
                  <Button onClick={() => setIsOfficialWizardOpen(true)} className="flex-1 md:flex-none gap-2" variant={connectionOverview?.official.connected ? "outline" : "primary"}>
                    <Cloud size={18} />
                    {connectionOverview?.official.connected ? "Gerenciar API Oficial" : "Conectar API Oficial"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ==================================== */}
        {/* QUICK LINKS                          */}
        {/* ==================================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon, description }) => (
            <Link key={to} to={to} className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-cyan-500/40 hover:bg-slate-900/80 backdrop-blur-md">
              <div className="mb-3 inline-flex rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
                <Icon size={20} aria-hidden />
              </div>
              <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                {label}
              </p>
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            </Link>
          ))}
        </div>

        {/* ==================================== */}
        {/* STATS COUNT GRID                     */}
        {/* ==================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="relative overflow-hidden border border-slate-800 bg-slate-900/60 backdrop-blur-xl hover:border-cyan-500/30 transition-all duration-300">
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
                      {loading ? <Loader2 size={24} className="animate-spin text-slate-600" /> : item.value}
                    </h2>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* ==================================== */}
        {/* METRICS CHARTS & PERFORMANCE SIDEBAR */}
        {/* ==================================== */}
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
                      <linearGradient id="colorMensagens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 16, color: "#fff" }} />
                    <Area type="monotone" dataKey="mensagens" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMensagens)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* SIDE PANEL PERFORMANCE */}
          <div className="space-y-6">
            <Card className="border border-slate-800 bg-slate-900/60 p-6 rounded-3xl">
              <CardHeader className="p-0 mb-4">
               <h3 className="text-lg font-bold text-white">Performance Operacional</h3>
              </CardHeader>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                      <Clock3 size={18} className="text-amber-400" />
                    </div>
                    <span className="text-slate-300">Tempo de Resposta Média</span>
                  </div>
                  <span className="text-white font-bold">{metrics.averageResponseTime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10">
                      <Activity size={18} className="text-cyan-400" />
                    </div>
                    <span className="text-slate-300">Latência do Servidor</span>
                  </div>
                  <span className="text-emerald-400 font-bold">Estável</span>
                </div>
              </div>
            </Card>

            {/* QUICK MONITOR CARD */}
            <Card className="border border-slate-800 bg-slate-900/60 p-6 rounded-3xl">
              <CardHeader className="p-0 mb-4">
                <h3 className="text-lg font-bold text-white">Status do Motor de IA</h3>
              </CardHeader>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center gap-2">
                    {chatbotOn ? (
                      <CheckCircle2 className="text-emerald-400" size={18} />
                    ) : (
                      <ServerCrash className="text-red-400" size={18} />
                    )}
                    <span className="text-sm text-slate-300">
                      {chatbotOn ? "Chatbot ativo respondendo requisições" : "Automações pausadas pelo administrador"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ==================================== */}
        {/* MODAL: QR CODE SCANNER               */}
        {/* ==================================== */}
        <Modal
          variant="form"
          pageWidth="md"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          icon={Wifi}
          title="Conectar WhatsApp"
          subtitle="Escaneie o código QR com o WhatsApp para ligar a sua instância."
        >
          <ModalBody className="flex flex-col items-center">
            <ModalSection className="flex w-full flex-col items-center text-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 mb-6 ${
                modalStatus.includes("sucesso")
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : modalStatus.includes("Erro")
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              }`}>
                {modalStatus.includes("sucesso") ? (
                  <CheckCircle2 size={16} />
                ) : modalStatus.includes("Erro") ? (
                  <WifiOff size={16} />
                ) : (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {modalStatus}
              </div>

              {/* QR BOX STYLED */}
              <div className="relative w-64 h-64 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 overflow-hidden">
                {loadingQr ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                    <span className="text-xs text-slate-500">Gerando QR Code...</span>
                  </div>
                ) : modalStatus.includes("sucesso") ? (
                  <div className="flex flex-col items-center gap-3 text-emerald-400">
                    <CheckCircle2 size={64} />
                    <span className="text-sm font-bold">Conectado!</span>
                  </div>
                ) : qrcode ? (
                  <img src={qrcode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-600 flex flex-col items-center">
                    <WifiOff size={48} className="mb-2 opacity-40" />
                    <span className="text-sm">Falha ao carregar</span>
                  </div>
                )}
              </div>

              <Button type="button" variant="outline" className="mt-6 gap-2" onClick={handleManageConnection}>
                <RefreshCw size={16} className={loadingQr ? "animate-spin" : ""} aria-hidden />
                Atualizar QR
              </Button>
            </ModalSection>
          </ModalBody>
        </Modal>

        {/* WIZARD DA API OFICIAL */}
        <OfficialWhatsAppWizard
          isOpen={isOfficialWizardOpen}
          onClose={() => setIsOfficialWizardOpen(false)}
          onConnected={() => void handleRefreshAll()}
        />

      </div>
    </Layout>
  );
};

export default Dashboard;