import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { Modal } from '../ui/Modal';
import { dashboardCardClass } from '../dashboard/dashboardTheme';
import { ConnectionPanelSkeleton } from '../ui/Skeleton';
import { connectionService } from '../../services/ConnectionService';
import type { ConnectionOverview, WhatsappChannel } from '../../types/connection';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/apiError';

/** Cadastro incorporado Meta — WhatsApp Cloud API (Embedded Signup). */
const META_WHATSAPP_EMBEDDED_ONBOARD_URL =
  'https://business.facebook.com/messaging/whatsapp/onboard/?app_id=26961034173555672&config_id=933599703049021&extras=%7B%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v4%22%7D';
const META_ONBOARD_WINDOW_NAME = 'meta_whatsapp_onboard';

let metaOnboardPopup: Window | null = null;

function openMetaWhatsAppOnboard(): void {
  const url = META_WHATSAPP_EMBEDDED_ONBOARD_URL;

  if (metaOnboardPopup && !metaOnboardPopup.closed) {
    try {
      metaOnboardPopup.location.href = url;
    } catch {
      metaOnboardPopup = null;
    }
    metaOnboardPopup?.focus();
    if (metaOnboardPopup && !metaOnboardPopup.closed) return;
  }

  const width = Math.round(window.screen.availWidth * 0.7);
  const height = Math.round(window.screen.availHeight * 0.95);
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = Math.round((screen.availLeft ?? 0) + (window.screen.availWidth - width) / 2);
  const top = Math.round((screen.availTop ?? 0) + (window.screen.availHeight - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'scrollbars=yes',
    'resizable=yes',
    'toolbar=no',
    'menubar=no',
    'location=yes',
    'status=no',
  ].join(',');

  const opened = window.open(url, META_ONBOARD_WINDOW_NAME, features);
  if (!opened) throw new Error('O navegador bloqueou a janela. Permita pop-ups e tente novamente.');

  metaOnboardPopup = opened;
  opened.focus();
}

type WhatsAppConnectionPanelProps = {
  onOverviewChange?: (overview: ConnectionOverview) => void;
  className?: string;
};

export function WhatsAppConnectionPanel({ onOverviewChange, className = '' }: WhatsAppConnectionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ConnectionOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onOverviewChangeRef = useRef(onOverviewChange);
  const userToggledExpandRef = useRef(false);

  useEffect(() => {
    onOverviewChangeRef.current = onOverviewChange;
  });

  const loadOverview = useCallback(async (options?: { notifyParent?: boolean; force?: boolean }) => {
    try {
      const data = await connectionService.getOverview({ force: options?.force });
      setOverview(data);
      if (options?.notifyParent) onOverviewChangeRef.current?.(data);
      return data;
    } catch (e) {
      console.error(e);
      toast.error(getApiErrorMessage(e, 'Não foi possível carregar as conexões.'));
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await loadOverview();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOverview]);

  const ready = Boolean(overview?.active.connected && overview?.active.chatbotEnabled);

  useEffect(() => {
    if (loading) return;
    if (ready && !userToggledExpandRef.current) {
      setExpanded(false);
    } else if (!ready) {
      setExpanded(true);
      userToggledExpandRef.current = false;
    }
  }, [loading, ready]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void loadOverview().then((data) => {
        if (!data) return;
        const channelConnected =
          data.whatsapp_channel === 'official' ? data.official.connected : data.evolution.connected;
        if (channelConnected) {
          setQrBase64(null);
          setQrModalOpen(false);
          stopPolling();
          onOverviewChangeRef.current?.(data);
          if (data.active.connected && data.active.chatbotEnabled) userToggledExpandRef.current = false;
          toast.success('WhatsApp conectado.');
        }
      });
    }, 3000);
  }, [loadOverview, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

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
        await loadOverview({ notifyParent: true });
        toast.success('WhatsApp já está conectado.');
        return;
      }
      if (res.base64) {
        setQrBase64(res.base64);
        setQrModalOpen(true);
        startPolling();
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
      const next = await loadOverview({ notifyParent: true });
      if (next) toast.success('WhatsApp Oficial desconectado.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível desconectar.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      await loadOverview({ notifyParent: true, force: true });
    } finally {
      setRefreshing(false);
    }
  };

  const toggleChatbot = async (enabled: boolean) => {
    setBusy(true);
    try {
      await connectionService.toggleChatbot(enabled);
      const next = await loadOverview({ notifyParent: true });
      if (next?.active.connected && next.active.chatbotEnabled && enabled) {
        userToggledExpandRef.current = false;
      }
      toast.success(enabled ? 'Assistente ativo no canal.' : 'Assistente pausado no canal.');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível alterar o assistente.'));
    } finally {
      setBusy(false);
    }
  };

  const channel = overview?.whatsapp_channel ?? 'evolution';
  const evolution = overview?.evolution;
  const official = overview?.official;
  const activeChatbot = overview?.active.chatbotEnabled ?? false;
  const activeConnected = overview?.active.connected ?? false;
  const activeChannelLabel =
    channel === 'official' ? 'WhatsApp Oficial' : 'Solução alternativa (QR)';

  const closeQrModal = () => {
    setQrModalOpen(false);
    stopPolling();
  };

  const openQrModal = () => {
    if (!qrBase64) return;
    setQrModalOpen(true);
    if (!evolution?.connected) startPolling();
  };

  const channelOptions: {
    id: WhatsappChannel;
    title: string;
    description: string;
    connected: boolean;
    connecting: boolean;
  }[] = [
    {
      id: 'evolution',
      title: 'Solução alternativa',
      description: 'Ligação por QR Code. Escaneie o código no telemóvel com o WhatsApp.',
      connected: evolution?.connected ?? false,
      connecting: evolution?.connectionStatus === 'CONNECTING',
    },
    {
      id: 'official',
      title: 'WhatsApp Oficial (Meta)',
      description: 'Cloud API da Meta. Ideal para volume e conformidade empresarial.',
      connected: official?.connected ?? false,
      connecting: false,
    },
  ];

  return (
    <>
      <article className={`${dashboardCardClass} ${className}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              userToggledExpandRef.current = true;
              setExpanded((v) => !v);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={expanded}>
            <ChevronDown
              size={20}
              className={`shrink-0 text-foreground-icon transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Conexão WhatsApp</h2>
              {!expanded && !loading ? (
                ready ? (
                  <Badge variant="success">Conectado e ativo</Badge>
                ) : activeConnected ? (
                  <Badge variant="warning">Conectado</Badge>
                ) : (
                  <Badge variant="danger">Desconectado</Badge>
                )
              ) : null}
            </div>
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || busy || refreshing}
            className="relative z-10 h-9 w-9 shrink-0 !p-0"
            aria-label="Atualizar status"
            title="Atualizar status"
            onClick={(e) => void handleRefreshStatus(e)}>
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw size={16} aria-hidden />
            )}
          </Button>
        </div>

        {expanded ? (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {loading ? (
              <ConnectionPanelSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {channelOptions.map((option) => {
                    const selected = channel === option.id;
                    const statusBadge = option.connected ? (
                      <Badge variant="success">Conectado</Badge>
                    ) : option.connecting ? (
                      <Badge variant="warning">A conectar</Badge>
                    ) : (
                      <Badge variant="danger">Desconectado</Badge>
                    );

                    return (
                      <div
                        key={option.id}
                        className={[
                          'flex h-full flex-col rounded-xl border p-4 transition-all',
                          selected
                            ? 'border-primary bg-primary-a5 ring-1 ring-primary-a30'
                            : 'border-border bg-surface-muted',
                          busy ? 'opacity-60' : '',
                        ].join(' ')}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void selectChannel(option.id)}
                          className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed">
                          <span
                            className={[
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                              selected
                                ? 'border-primary bg-primary text-foreground-inverse'
                                : 'border-border',
                            ].join(' ')}>
                            {selected ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                          </span>
                          <span className="min-w-0 flex-1 space-y-1.5">
                            <span className="block text-sm font-semibold leading-snug text-foreground">
                              {option.title}
                            </span>
                            <span className="block">{statusBadge}</span>
                            <span className="block text-xs leading-relaxed text-foreground-muted">
                              {option.description}
                            </span>
                          </span>
                        </button>

                        {selected ? (
                          <div className="mt-4 border-t border-border-subtle pt-4 [&_button]:w-full [&_button]:sm:w-auto">
                            {option.id === 'evolution' ? (
                              <div className="space-y-3">
                                {evolution?.connected ? (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    WhatsApp ligado por QR Code.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={loadingQr || busy}
                                      onClick={() => (qrBase64 ? openQrModal() : void loadQr())}>
                                      {loadingQr ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <QrCode size={14} />
                                      )}
                                      {qrBase64 ? 'Ver QR Code' : 'Gerar QR Code'}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={loadingQr || busy}
                                      onClick={() => void loadQr()}>
                                      {loadingQr ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <RefreshCw size={14} />
                                      )}
                                      Atualizar QR Code
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : official?.connected ? (
                              <div className="space-y-3">
                                {official.display_phone ? (
                                  <p className="text-xs text-foreground-muted">{official.display_phone}</p>
                                ) : null}
                                {official.verified_name ? (
                                  <p className="text-xs text-foreground-muted">{official.verified_name}</p>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void disconnectOfficial()}>
                                  Desconectar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1.5"
                                disabled={busy}
                                onClick={() => {
                                  void (async () => {
                                    setBusy(true);
                                    try {
                                      await connectionService.startOfficialSignup();
                                      openMetaWhatsAppOnboard();
                                      toast.info(
                                        'Conclua o cadastro na Meta. A conexão será activada automaticamente.',
                                      );
                                      startPolling();
                                    } catch (e) {
                                      toast.error(
                                        getApiErrorMessage(e, 'Não foi possível abrir o cadastro da Meta.'),
                                      );
                                    } finally {
                                      setBusy(false);
                                    }
                                  })();
                                }}>
                                <ExternalLink size={14} />
                                Conectar com Meta
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Smartphone size={16} className="shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 break-words">Canal ativo: {activeChannelLabel}</span>
                    </div>
                    {activeConnected ? (
                      <Badge variant="success">Operacional</Badge>
                    ) : (
                      <Badge variant="warning">Aguarda ligação</Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <span className="text-sm text-foreground-muted sm:hidden">Assistente no canal</span>
                    <Switch
                      checked={activeChatbot}
                      disabled={busy || !activeConnected}
                      onCheckedChange={(v) => void toggleChatbot(v)}
                      aria-label="Ativar assistente no canal ativo"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </article>

      <Modal
        isOpen={qrModalOpen && Boolean(qrBase64)}
        onClose={closeQrModal}
        title="Ligar WhatsApp"
        subtitle="Escaneie o código no telemóvel."
        icon={QrCode}
        variant="page"
        pageWidth="md"
        footer={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loadingQr}
            onClick={() => void loadQr()}>
            {loadingQr ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar QR Code
          </Button>
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
          <p className="flex items-center gap-2 text-xs text-foreground-muted">
            <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
            A aguardar leitura do código…
          </p>
        </div>
      </Modal>
    </>
  );
}
