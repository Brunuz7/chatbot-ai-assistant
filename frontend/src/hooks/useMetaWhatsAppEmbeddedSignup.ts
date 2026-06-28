import { useCallback, useEffect, useRef } from 'react';
import { META_EMBEDDED_CONFIG_ID } from '../constants/metaWhatsApp';
import { connectionService } from '../services/ConnectionService';
import type { MetaFbLoginResponse } from '../types/metaSdk';

type EmbeddedSignupSession = {
  wabaId?: string;
  phoneNumberId?: string;
};

function isFacebookOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'facebook.com' || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

function parseEmbeddedSignupMessage(raw: unknown): EmbeddedSignupSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as {
    type?: string;
    event?: string;
    data?: { waba_id?: string; phone_number_id?: string };
  };
  if (payload.type !== 'WA_EMBEDDED_SIGNUP') return null;
  if (payload.event && payload.event !== 'FINISH') return null;

  const wabaId = payload.data?.waba_id?.trim();
  const phoneNumberId = payload.data?.phone_number_id?.trim();
  if (!wabaId && !phoneNumberId) return null;

  return { wabaId, phoneNumberId };
}

function waitForFbSdk(timeoutMs = 15000): Promise<NonNullable<Window['FB']>> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (window.FB) {
        resolve(window.FB);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('O SDK do Facebook não carregou. Recarregue a página e tente novamente.'));
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });
}

type UseMetaWhatsAppEmbeddedSignupOptions = {
  onComplete?: () => void;
};

/**
 * Cadastro incorporado Meta via FB.login + evento WA_EMBEDDED_SIGNUP.
 * A Meta devolve um code (FB.login) e waba_id/phone_number_id (postMessage);
 * o backend troca o code por access_token e subscreve o WABA.
 */
export function useMetaWhatsAppEmbeddedSignup(options: UseMetaWhatsAppEmbeddedSignupOptions = {}) {
  const sessionRef = useRef<EmbeddedSignupSession>({});
  const pendingCodeRef = useRef<string | null>(null);
  const completingRef = useRef(false);
  const onCompleteRef = useRef(options.onComplete);

  useEffect(() => {
    onCompleteRef.current = options.onComplete;
  }, [options.onComplete]);

  const tryCompleteSignup = useCallback(async () => {
    if (completingRef.current) return false;

    const code = pendingCodeRef.current?.trim();
    const wabaId = sessionRef.current.wabaId?.trim();
    const phoneNumberId = sessionRef.current.phoneNumberId?.trim();
    if (!code || !wabaId || !phoneNumberId) return false;

    completingRef.current = true;
    try {
      await connectionService.completeOfficialSignup({
        code,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
      });
      pendingCodeRef.current = null;
      sessionRef.current = {};
      onCompleteRef.current?.();
      return true;
    } finally {
      completingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isFacebookOrigin(event.origin)) return;

      let parsed: unknown = event.data;
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
      }

      const session = parseEmbeddedSignupMessage(parsed);
      if (!session) return;

      sessionRef.current = {
        wabaId: session.wabaId ?? sessionRef.current.wabaId,
        phoneNumberId: session.phoneNumberId ?? sessionRef.current.phoneNumberId,
      };

      void tryCompleteSignup();
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [tryCompleteSignup]);

  const launchWhatsAppSignup = useCallback(async () => {
    sessionRef.current = {};
    pendingCodeRef.current = null;
    completingRef.current = false;

    await connectionService.startOfficialSignup();

    const FB = await waitForFbSdk();

    return new Promise<void>((resolve, reject) => {
      FB.login(
        (response: MetaFbLoginResponse) => {
          const code = response.authResponse?.code?.trim();
          if (!code) {
            reject(new Error('Cadastro cancelado ou não concluído.'));
            return;
          }

          pendingCodeRef.current = code;

          const waitForCompletion = async () => {
            for (let attempt = 0; attempt < 150; attempt += 1) {
              if (await tryCompleteSignup()) return true;

              const overview = await connectionService.getOverview({ force: true, live: true });
              if (overview.official.connected) {
                pendingCodeRef.current = null;
                sessionRef.current = {};
                onCompleteRef.current?.();
                return true;
              }

              await new Promise((r) => window.setTimeout(r, 200));
            }
            return false;
          };

          void waitForCompletion()
            .then((completed) => {
              if (completed) {
                resolve();
                return;
              }
              reject(
                new Error(
                  'Cadastro concluído na Meta, mas faltam os identificadores da conta. Feche o pop-up, clique em Conectar e tente de novo.',
                ),
              );
            })
            .catch(reject);
        },
        {
          config_id: META_EMBEDDED_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { version: 'v4', sessionInfoVersion: '3' },
        },
      );
    });
  }, [tryCompleteSignup]);

  return { launchWhatsAppSignup };
}
