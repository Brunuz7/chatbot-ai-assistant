import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import api from '../services/api';
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  ExternalLink,
  Cloud,
  RefreshCw,
  Loader2,
  LayoutDashboard,
  Users,
  Bot,
  Workflow,
} from 'lucide-react';
import { Modal, ModalBody, ModalSection } from '../components/ui/Modal';
import { OfficialWhatsAppWizard } from '../components/whatsapp/OfficialWhatsAppWizard';
import type { ConnectionOverview, WhatsappChannel } from '../types/connection';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';

const QUICK_LINKS = [
  { to: '/contatos', label: 'Contatos', icon: Users, description: 'Lista e conversas' },
  { to: '/agentes', label: 'Agentes', icon: Bot, description: 'Assistentes de IA' },
  { to: '/fluxos', label: 'Fluxos', icon: Workflow, description: 'Fluxos de atendimento' },
] as const;

const Dashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfficialWizardOpen, setIsOfficialWizardOpen] = useState(false);
  const [connectionOverview, setConnectionOverview] = useState<ConnectionOverview | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [modalStatus, setModalStatus] = useState<string>('Aguardando...');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConnectionOverview = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await api.get<ConnectionOverview>('/api/connection/overview');
      setConnectionOverview(response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conexão:', error);
      return null;
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const fetchEvolutionStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/instance/status');
      setConnectionOverview((prev) =>
        prev
          ? {
              ...prev,
              evolution: {
                ...prev.evolution,
                connectionStatus: response.data.connectionStatus,
                instanceName: response.data.instanceName,
                chatbotEnabled: response.data.chatbotEnabled,
                connected: response.data.connectionStatus === 'CONNECTED',
              },
            }
          : prev,
      );
      return response.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchConnectionOverview();
  }, [fetchConnectionOverview]);

  useEffect(() => {
    if (isModalOpen) {
      setModalStatus('Aguardando leitura do QR Code...');
      pollingRef.current = setInterval(async () => {
        const data = await fetchEvolutionStatus();
        if (data?.connectionStatus === 'CONNECTED') {
          setModalStatus('Conectado com sucesso!');
          setTimeout(() => {
            setIsModalOpen(false);
            setQrcode(null);
            void fetchConnectionOverview(true);
          }, 1500);
        } else if (data?.connectionStatus === 'CONNECTING') {
          setModalStatus('Conectando...');
        } else {
          setModalStatus('Aguardando leitura do QR Code...');
        }
      }, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isModalOpen, fetchEvolutionStatus, fetchConnectionOverview]);

  const handleRefresh = () => {
    void fetchConnectionOverview();
  };

  const handleSetChannel = async (next: WhatsappChannel) => {
    if (connectionOverview?.whatsapp_channel === next || savingChannel) return;
    setSavingChannel(true);
    try {
      const res = await api.patch<{ overview: ConnectionOverview }>('/api/connection/channel', {
        channel: next,
      });
      setConnectionOverview(res.data.overview);
      toast.success(
        next === 'official'
          ? 'Canal activo: WhatsApp Oficial (Cloud API).'
          : 'Canal activo: Evolution (QR).',
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível alterar o canal.'));
    } finally {
      setSavingChannel(false);
    }
  };

  const handleManageConnection = async () => {
    setIsModalOpen(true);
    setLoadingQr(true);
    setModalStatus('Criando instância...');
    try {
      const response = await api.get('/api/instance/qrcode');

      if (response.data.connected) {
        setIsModalOpen(false);
        void fetchConnectionOverview();
      } else if (response.data.base64) {
        setQrcode(response.data.base64);
        setModalStatus('Aguardando leitura do QR Code...');
      }
    } catch (error: unknown) {
      console.error('Erro ao gerenciar conexão:', error);
      const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message;
      setModalStatus(`Erro: ${errorMessage}`);
      setQrcode(null);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleToggleChatbot = async () => {
    if (!connectionOverview?.active.connected) {
      toast.error('Conecte o WhatsApp no canal seleccionado antes de activar o chatbot.');
      return;
    }

    const newState = !connectionOverview.active.chatbotEnabled;
    try {
      setRefreshing(true);
      await api.post('/api/connection/chatbot/toggle', { enabled: newState });
      await fetchConnectionOverview(true);
    } catch (error) {
      console.error('Erro ao alternar chatbot:', error);
      toast.error(getApiErrorMessage(error, 'Falha ao alternar chatbot.'));
    } finally {
      setRefreshing(false);
    }
  };

  const channel = connectionOverview?.whatsapp_channel ?? 'evolution';
  const activeStatus = connectionOverview?.active.connectionStatus ?? 'DISCONNECTED';
  const activeConnected = connectionOverview?.active.connected === true;
  const chatbotOn = connectionOverview?.active.chatbotEnabled ?? false;
  const activeLabel = connectionOverview?.active.instanceName ?? '—';

  const statusColor =
    activeStatus === 'CONNECTED'
      ? 'text-emerald-500'
      : activeStatus === 'CONNECTING'
        ? 'text-amber-500'
        : 'text-red-500';

  const statusLabel =
    activeStatus === 'CONNECTED'
      ? 'Conectado'
      : activeStatus === 'CONNECTING'
        ? 'Conectando...'
        : 'Desconectado';

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={LayoutDashboard}
          title="Início"
          subtitle="Estado da ligação WhatsApp e atalhos para o assistente."
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
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
              <Badge
                variant={
                  activeStatus === 'CONNECTED'
                    ? 'success'
                    : activeStatus === 'CONNECTING'
                      ? 'warning'
                      : 'danger'
                }
              >
                {refreshing && <Loader2 size={12} className="mr-1 animate-spin" />}
                {activeStatus === 'CONNECTED'
                  ? 'Sistema Online'
                  : activeStatus === 'CONNECTING'
                    ? 'Conectando...'
                    : 'Sistema Offline'}
              </Badge>
            </div>
          }
        />

        <Card
          className={`border-l-4 transition-all duration-300 ${
            activeStatus === 'CONNECTED'
              ? 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5'
              : activeStatus === 'CONNECTING'
                ? 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-500/5'
                : 'border-l-red-500 bg-red-50/30 dark:bg-red-500/5'
          }`}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Canal de WhatsApp em uso
              </p>
              <div
                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
                role="group"
                aria-label="Escolher canal WhatsApp"
              >
                <button
                  type="button"
                  disabled={savingChannel || refreshing}
                  onClick={() => void handleSetChannel('evolution')}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                    channel === 'evolution'
                      ? 'bg-white text-primary shadow-sm dark:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400',
                  ].join(' ')}
                >
                  <Wifi size={14} />
                  Evolution (QR)
                </button>
                <button
                  type="button"
                  disabled={savingChannel || refreshing}
                  onClick={() => void handleSetChannel('official')}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                    channel === 'official'
                      ? 'bg-white text-primary shadow-sm dark:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400',
                  ].join(' ')}
                >
                  <Cloud size={14} />
                  API Oficial
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full transition-colors ${
                    activeStatus === 'CONNECTED'
                      ? 'bg-emerald-100 text-emerald-600'
                      : activeStatus === 'CONNECTING'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-600'
                  }`}
                >
                  {channel === 'official' ? (
                    <Cloud size={24} />
                  ) : activeStatus === 'CONNECTED' ? (
                    <Wifi size={24} />
                  ) : activeStatus === 'CONNECTING' ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <WifiOff size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {channel === 'official' ? 'WhatsApp Oficial' : 'WhatsApp Evolution'}:{' '}
                    <span className={statusColor}>{statusLabel}</span>
                    {refreshing && <Loader2 size={16} className="animate-spin text-slate-400" />}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {channel === 'official' ? 'Número' : 'Instância'}:{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{activeLabel}</span>
                  </p>
                  {connectionOverview && (
                    <p className="text-xs text-slate-500 mt-1">
                      {channel === 'evolution' ? (
                        connectionOverview.official.connected ? (
                          <>API Oficial também configurada (inactiva).</>
                        ) : (
                          <>API Oficial ainda não configurada.</>
                        )
                      ) : connectionOverview.evolution.connected ? (
                        <>Evolution (QR) também conectado (inactivo).</>
                      ) : (
                        <>Evolution (QR) não conectado.</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chatbot</span>
                <button
                  type="button"
                  onClick={() => void handleToggleChatbot()}
                  disabled={!activeConnected || refreshing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    chatbotOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  } ${!activeConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      chatbotOn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={handleRefresh}
                  className="gap-2"
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </Button>
                {channel === 'evolution' ? (
                  <Button
                    onClick={handleManageConnection}
                    className="flex-1 md:flex-none gap-2"
                    variant={connectionOverview?.evolution.connected ? 'outline' : 'primary'}
                  >
                    <ExternalLink size={18} />
                    {connectionOverview?.evolution.connected ? 'Gerenciar QR' : 'Conectar via QR'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsOfficialWizardOpen(true)}
                    className="flex-1 md:flex-none gap-2"
                    variant={connectionOverview?.official.connected ? 'outline' : 'primary'}
                  >
                    <Cloud size={18} />
                    {connectionOverview?.official.connected
                      ? 'Gerenciar API Oficial'
                      : 'Conectar API Oficial'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/50"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <Icon size={20} aria-hidden />
              </div>
              <p className="font-semibold text-slate-900 dark:text-white group-hover:text-primary">
                {label}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </Link>
          ))}
        </div>

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
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  modalStatus.includes('sucesso')
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : modalStatus.includes('Erro')
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                }`}
              >
                {modalStatus.includes('sucesso') ? (
                  <CheckCircle2 size={16} />
                ) : modalStatus.includes('Erro') ? (
                  <WifiOff size={16} />
                ) : (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {modalStatus}
              </div>

              <div className="relative w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                {loadingQr ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
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

              <Button
                type="button"
                variant="outline"
                className="mt-4 gap-2"
                onClick={handleManageConnection}
                disabled={loadingQr}
              >
                <RefreshCw size={16} className={loadingQr ? 'animate-spin' : ''} aria-hidden />
                Atualizar QR
              </Button>
            </ModalSection>
          </ModalBody>
        </Modal>

        <OfficialWhatsAppWizard
          isOpen={isOfficialWizardOpen}
          onClose={() => setIsOfficialWizardOpen(false)}
          onConnected={() => void fetchConnectionOverview()}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
