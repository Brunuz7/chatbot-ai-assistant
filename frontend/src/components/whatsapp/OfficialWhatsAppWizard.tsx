import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, Loader2, Smartphone } from 'lucide-react';
import { Modal, ModalBody } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';
import type { ConnectionOverview } from '../../types/connection';
import { useMetaEmbeddedSignup } from '../../hooks/useMetaEmbeddedSignup';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/apiError';

export type OfficialWhatsAppStatus = {
  connected: boolean;
  status: string;
  phone_number_id: string | null;
  waba_id: string | null;
  business_account_id: string | null;
  display_phone: string | null;
  verified_name: string | null;
  last_validated_at: string | null;
  has_token: boolean;
  token_preview: string | null;
};

type OfficialWhatsAppWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
};

export const OfficialWhatsAppWizard: React.FC<OfficialWhatsAppWizardProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [status, setStatus] = useState<OfficialWhatsAppStatus | null>(null);
  const [coexistence, setCoexistence] = useState(true);
  const [registerPin, setRegisterPin] = useState('');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [verifyTokenOk, setVerifyTokenOk] = useState(false);

  const { config: embeddedConfig, sdkReady, launching, launch, reloadConfig } =
    useMetaEmbeddedSignup();

  const embeddedAvailable = embeddedConfig?.available === true;
  const pinRequired = embeddedAvailable && !embeddedConfig?.register_pin_configured;
  const canConnect =
    embeddedAvailable &&
    sdkReady &&
    (!pinRequired || registerPin.length === 6);

  const loadStatus = useCallback(async () => {
    try {
      const [res, overviewRes] = await Promise.all([
        api.get<OfficialWhatsAppStatus>('/api/whatsapp-official/status'),
        api.get<ConnectionOverview>('/api/connection/overview'),
      ]);
      setStatus(res.data);
      setWebhookUrl(overviewRes.data.official_webhook_url ?? null);
      setVerifyTokenOk(overviewRes.data.meta_verify_token_configured === true);
    } catch {
      setStatus(null);
    }
  }, []);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      void loadStatus();
      void reloadConfig();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, loadStatus, reloadConfig]);

  const finishConnected = async () => {
    toast.success('WhatsApp Oficial conectado com sucesso!');
    await loadStatus();
    onConnected?.();
    onClose();
  };

  const handleEmbeddedConnect = async () => {
    try {
      await launch({
        coexistence,
        onComplete: async ({ code, session }) => {
          await api.post('/api/whatsapp-official/embedded-signup/complete', {
            code,
            waba_id: session.waba_id,
            phone_number_id: session.phone_number_id,
            business_account_id: session.business_id,
            pin: registerPin.trim() || undefined,
          });
          await finishConnected();
        },
      });
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível concluir o cadastro incorporado.'));
    }
  };

  const footer = (
    <div className="pointer-events-auto flex w-full justify-end">
      <Button
        type="button"
        className="gap-2"
        disabled={!canConnect || launching}
        onClick={() => void handleEmbeddedConnect()}
      >
        {launching ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
        Conectar com Meta
      </Button>
    </div>
  );

  return (
    <Modal
      variant="form"
      pageWidth="lg"
      isOpen={isOpen}
      onClose={onClose}
      icon={Smartphone}
      title="Conectar WhatsApp Oficial"
      subtitle="Cadastro incorporado Meta (Embedded Signup)."
      footer={embeddedAvailable ? footer : undefined}
    >
      <ModalBody>
        <div className="space-y-4 max-w-lg">
          {status?.connected && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Já conectado
              </p>
              {status.display_phone && (
                <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">{status.display_phone}</p>
              )}
              {status.verified_name && (
                <p className="text-slate-500 text-xs">{status.verified_name}</p>
              )}
            </div>
          )}

          {embeddedAvailable ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Abra o fluxo oficial da Meta para ligar a Cloud API. Token e identificadores são
                guardados automaticamente.
              </p>
              <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={coexistence}
                  onChange={(e) => setCoexistence(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Coexistência</span> — manter o app WhatsApp Business
                  no mesmo número (requer suporte Meta no seu app).
                </span>
              </label>
              {pinRequired && (
                <div className="space-y-1">
                  <Input
                    label="PIN de 6 dígitos (registo Cloud API)"
                    placeholder="000000"
                    maxLength={6}
                    value={registerPin}
                    onChange={(e) =>
                      setRegisterPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Defina <code className="text-xs">META_WHATSAPP_REGISTER_PIN</code> no servidor para
                    omitir este campo.
                  </p>
                </div>
              )}
              {!sdkReady && (
                <p className="text-xs text-amber-600 dark:text-amber-400">A carregar SDK da Meta…</p>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-2">Cadastro incorporado indisponível</p>
              <p className="text-xs leading-relaxed">
                Configure no servidor: <code className="text-xs">META_APP_ID</code>,{' '}
                <code className="text-xs">META_APP_SECRET</code>,{' '}
                <code className="text-xs">META_EMBEDDED_SIGNUP_CONFIG_ID</code> e{' '}
                <code className="text-xs">META_WEBHOOK_VERIFY_TOKEN</code>.
              </p>
            </div>
          )}

          {webhookUrl && (
            <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 p-3 text-xs space-y-1">
              <p className="font-semibold text-sky-800 dark:text-sky-300">Webhook (app Meta)</p>
              <code className="block break-all text-slate-700 dark:text-slate-300">{webhookUrl}</code>
              <p className="text-slate-500">
                Verify token: <code className="text-xs">META_WEBHOOK_VERIFY_TOKEN</code>
                {verifyTokenOk ? ' (configurado)' : ' (não definido)'}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};
