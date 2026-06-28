import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  Loader2,
  MoreVertical,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { dashboardCardClass, DASHBOARD_ICON_GREEN_TONE } from '../dashboard/dashboardTheme';
import { WhatsAppBrandIcon } from '../dashboard/WhatsAppBrandIcon';
import { connectionService } from '../../services/ConnectionService';
import type { ConnectionOverview, WhatsappChannel } from '../../types/connection';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/apiError';
import { useMetaWhatsAppEmbeddedSignup } from '../../hooks/useMetaWhatsAppEmbeddedSignup';

type WhatsAppConnectionPanelProps = {
  onOverviewChange?: (overview: ConnectionOverview) => void;
  className?: string;
};

function isEvolutionChannelEnabledFromEnv(): boolean {
  const raw = (import.meta.env.VITE_WHATSAPP_EVOLUTION_CHANNEL_ENABLED ?? '1').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(raw);
}

export function WhatsAppConnectionPanel({ onOverviewChange, className = '' }: WhatsAppConnectionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ConnectionOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const onOverviewChangeRef = useRef(onOverviewChange);

  useEffect(() => {
    onOverviewChangeRef.current = onOverviewChange;
  });

  const loadOverview = useCallback(async (options?: { notifyParent?: boolean; force?: boolean; live?: boolean }) => {
    setLoading(true);
    try {
      const data = await connectionService.getOverview({ force: options?.force, live: options?.live });
      setOverview(data);
      if (options?.notifyParent) onOverviewChangeRef.current?.(data);
      return data;
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível carregar as conexões.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview({ live: true });
  }, [loadOverview]);

  const checkConnection = useCallback(
    async (options?: { notifyParent?: boolean }) => {
      setCheckingConnection(true);
      try {
        const data = await loadOverview({ notifyParent: options?.notifyParent, force: true, live: true });
        if (!data) return false;

        const channelConnected =
          data.whatsapp_channel === 'official' || !data.features?.evolution_channel
            ? data.official.connected
            : (data.evolution?.connected ?? false);

        if (channelConnected) {
          setQrBase64(null);
          setQrModalOpen(false);
          onOverviewChangeRef.current?.(data);
          toast.success('WhatsApp conectado.');
          return true;
        }

        return false;
      } finally {
        setCheckingConnection(false);
      }
    },
    [loadOverview],
  );

  const { launchWhatsAppSignup } = useMetaWhatsAppEmbeddedSignup();

  const selectChannel = async (channel: WhatsappChannel) => {
    if (!overview || overview.whatsapp_channel === channel) return;
    setBusy(true);
    try {
      const next = await connectionService.setChannel(channel);
      setOverview(next);
      onOverviewChangeRef.current?.(next);
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível alterar o canal.'));
    } finally {
      setBusy(false);
    }
  };

  const loadQr = async () => {
    setLoadingQr(true);
    try {
      const res = await connectionService.getQrCode();
      if (res.connected) {
        setQrBase64(null);
        setQrModalOpen(false);
        await loadOverview({ notifyParent: true, live: true });
        toast.success('WhatsApp já está conectado.');
        return;
      }
      if (res.base64) {
        setQrBase64(res.base64);
        setQrModalOpen(true);
      } else {
        toast.error('Não foi possível gerar o QR Code. Aguarde alguns segundos e tente novamente.');
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível gerar o QR Code. Tente novamente.'));
    } finally {
      setLoadingQr(false);
    }
  };

  const disconnectOfficial = async () => {
    setBusy(true);
    try {
      await connectionService.disconnectOfficial();
      const next = await loadOverview({ notifyParent: true, live: true });
      if (next) toast.success('WhatsApp Oficial desconectado.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível desconectar.'));
    } finally {
      setBusy(false);
    }
  };

  const connectOfficial = async () => {
    setBusy(true);
    try {
      if (evolutionEnabled && channel !== 'official') {
        const next = await connectionService.setChannel('official');
        setOverview(next);
      }
      await launchWhatsAppSignup();
      await loadOverview({ notifyParent: true, live: true });
      toast.success('WhatsApp Oficial conectado.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível concluir o cadastro da Meta.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await loadOverview({ notifyParent: true, force: true, live: true });
    } finally {
      setRefreshing(false);
    }
  };

  const toggleChatbot = async (enabled: boolean) => {
    setBusy(true);
    try {
      await connectionService.toggleChatbot(enabled);
      await loadOverview({ notifyParent: true, live: true });
      toast.success(enabled ? 'Assistente ativo.' : 'Assistente pausado.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível alterar o assistente.'));
    } finally {
      setBusy(false);
    }
  };

  const channel = overview?.whatsapp_channel ?? 'official';
  const evolutionEnabled = overview?.features?.evolution_channel ?? isEvolutionChannelEnabledFromEnv();
  const evolution = overview?.evolution;
  const official = overview?.official;
  const activeChatbot = overview?.active.chatbotEnabled ?? false;
  const activeConnected = overview?.active.connected ?? false;
  const officialConnected = official?.connected ?? false;

  const displayName =
    officialConnected && official?.verified_name
      ? official.verified_name
      : activeConnected && channel === 'evolution'
        ? 'WhatsApp Web'
        : 'WhatsApp Business';

  const displaySubtitle =
    officialConnected && official?.display_phone
      ? official.display_phone
      : activeConnected && channel === 'evolution'
        ? 'Ligação por QR Code'
        : 'Conecte com a API oficial da Meta';

  const menuItemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-a10 disabled:cursor-not-allowed disabled:opacity-50';

  const hasMenuItems = officialConnected || evolutionEnabled;

  return (
    <>
      <article
        className={`${dashboardCardClass} ${className} ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${
              activeConnected ? DASHBOARD_ICON_GREEN_TONE : 'bg-slate-500 text-white'
            }`}>
            <WhatsAppBrandIcon className="h-5 w-5 text-white" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold leading-tight text-foreground">{displayName}</p>
                <p className="truncate text-xs leading-tight text-foreground-muted">{displaySubtitle}</p>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {loading ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : activeConnected ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  {activeChatbot ? 'Operacional' : 'Pausado'}
                </span>

                <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

                <label className="flex cursor-pointer items-center gap-2">
                  <span className="hidden text-xs text-foreground-muted sm:inline">Assistente</span>
                  <Switch
                    checked={activeChatbot}
                    disabled={busy}
                    onCheckedChange={(v) => void toggleChatbot(v)}
                    aria-label="Assistente automático"
                  />
                </label>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => void connectOfficial()}>
                <ExternalLink size={14} aria-hidden />
                Conectar
              </Button>
            )}

            <button
              type="button"
              disabled={loading || busy || refreshing}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-a10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Atualizar status"
              title="Atualizar status"
              onClick={() => void handleRefreshStatus()}>
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </button>

            {!loading && hasMenuItems ? (
              <details className="relative">
                <summary
                  className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-a10 hover:text-foreground marker:content-none [&::-webkit-details-marker]:hidden"
                  aria-label="Mais opções">
                  <MoreVertical size={16} aria-hidden />
                </summary>
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                  {officialConnected ? (
                    <button type="button" className={menuItemClass} disabled={busy} onClick={() => void disconnectOfficial()}>
                      Desconectar
                    </button>
                  ) : null}
                  {evolutionEnabled ? (
                    <>
                      {officialConnected ? <div className="my-1 h-px bg-border" aria-hidden /> : null}
                      <button
                        type="button"
                        className={menuItemClass}
                        disabled={busy || channel === 'evolution'}
                        onClick={() => void selectChannel('evolution')}>
                        Usar canal QR
                      </button>
                      {!evolution?.connected ? (
                        <button
                          type="button"
                          className={menuItemClass}
                          disabled={loadingQr || busy || channel !== 'evolution'}
                          onClick={() => void (qrBase64 ? setQrModalOpen(true) : loadQr())}>
                          {loadingQr ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                          ) : (
                            <QrCode size={14} aria-hidden />
                          )}
                          Ligar por QR Code
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </article>

      {evolutionEnabled ? (
        <Modal
          isOpen={qrModalOpen && Boolean(qrBase64)}
          onClose={() => setQrModalOpen(false)}
          title="Ligar WhatsApp"
          subtitle="Escaneie o código no telemóvel."
          icon={QrCode}
          variant="page"
          pageWidth="md"
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={loadingQr || checkingConnection}
                onClick={() => void loadQr()}>
                {loadingQr ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Atualizar QR Code
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={loadingQr || checkingConnection}
                onClick={() => void checkConnection({ notifyParent: true })}>
                {checkingConnection ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Verificar ligação
              </Button>
            </div>
          }>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <img
                src={
                  qrBase64?.startsWith('data:')
                    ? qrBase64
                    : `data:image/png;base64,${qrBase64 ?? ''}`
                }
                alt="QR Code WhatsApp"
                className="h-56 w-56 max-w-[min(72vw,14rem)] object-contain sm:h-64 sm:w-64"
              />
            </div>
            <p className="max-w-sm text-center text-sm leading-relaxed text-foreground-muted">
              No WhatsApp:{' '}
              <span className="font-medium text-foreground">
                Menu → Dispositivos ligados → Ligar dispositivo
              </span>
            </p>
            <p className="max-w-sm text-center text-sm leading-relaxed text-foreground-muted">
              Após escanear o código, clique em{' '}
              <span className="font-medium text-foreground">Verificar ligação</span> para confirmar a conexão.
            </p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
