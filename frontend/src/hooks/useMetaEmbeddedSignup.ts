import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { ensureFacebookSdk } from '../lib/facebookSdk';
import type {
  EmbeddedSignupMessageEvent,
  EmbeddedSignupPublicConfig,
  EmbeddedSignupSessionData,
} from '../types/metaEmbeddedSignup';

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
    };
  }
}

export function useMetaEmbeddedSignup() {
  const [config, setConfig] = useState<EmbeddedSignupPublicConfig | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [launching, setLaunching] = useState(false);
  const configRef = useRef<EmbeddedSignupPublicConfig | null>(null);
  const pendingRef = useRef<{ code: string | null; session: EmbeddedSignupSessionData | null }>({
    code: null,
    session: null,
  });
  const flushHandlerRef = useRef<
    ((payload: { code: string; session: EmbeddedSignupSessionData }) => Promise<void>) | null
  >(null);
  const launchRejectRef = useRef<((reason: Error) => void) | null>(null);

  const tryFlush = useCallback(async () => {
    const { code, session } = pendingRef.current;
    if (!code || !session?.phone_number_id || !session?.waba_id || !flushHandlerRef.current) return;

    const payload = { code, session: { ...session } };
    pendingRef.current = { code: null, session: null };
    const handler = flushHandlerRef.current;
    flushHandlerRef.current = null;
    launchRejectRef.current = null;

    await handler(payload);
  }, []);

  const loadConfig = useCallback(async () => {
    const { data } = await api.get<EmbeddedSignupPublicConfig>(
      '/api/whatsapp-official/embedded-signup/config',
    );
    setConfig(data);
    configRef.current = data;
    return data;
  }, []);

  useEffect(() => {
    void loadConfig().catch(() => setConfig(null));
  }, [loadConfig]);

  useEffect(() => {
    const cfg = configRef.current ?? config;
    if (!cfg?.available || !cfg.app_id || !cfg.config_id) return;

    let cancelled = false;
    void ensureFacebookSdk({
      appId: cfg.app_id,
      autoLogAppEvents: true,
      xfbml: true,
      version: cfg.graph_version || 'v25.0',
    })
      .then(() => {
        if (!cancelled && window.FB) setSdkReady(true);
      })
      .catch(() => {
        if (!cancelled) setSdkReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      let parsed: EmbeddedSignupMessageEvent | null = null;
      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (raw?.type === 'WA_EMBEDDED_SIGNUP') parsed = raw as EmbeddedSignupMessageEvent;
      } catch {
        return;
      }
      if (!parsed) return;

      if (parsed.event === 'FINISH' && parsed.data?.phone_number_id && parsed.data?.waba_id) {
        pendingRef.current.session = parsed.data;
        void tryFlush().catch((err) => launchRejectRef.current?.(err instanceof Error ? err : new Error(String(err))));
      } else if (parsed.event === 'FINISH_ONLY_WABA') {
        launchRejectRef.current?.(
          new Error('Fluxo concluído sem número de telefone. Adicione um número no assistente Meta.'),
        );
        setLaunching(false);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [tryFlush]);

  const launch = useCallback(
    async (options: {
      coexistence?: boolean;
      onComplete: (payload: { code: string; session: EmbeddedSignupSessionData }) => Promise<void>;
    }) => {
      const cfg = configRef.current ?? config;
      if (!cfg?.available || !cfg.app_id || !cfg.config_id) {
        throw new Error('Cadastro incorporado não está configurado no servidor.');
      }

      await ensureFacebookSdk({
        appId: cfg.app_id,
        autoLogAppEvents: true,
        xfbml: true,
        version: cfg.graph_version || 'v25.0',
      });
      if (!window.FB) throw new Error('SDK da Meta indisponível.');

      setLaunching(true);
      pendingRef.current = { code: null, session: null };

      return new Promise<void>((resolve, reject) => {
        const fail = (err: Error) => {
          flushHandlerRef.current = null;
          launchRejectRef.current = null;
          pendingRef.current = { code: null, session: null };
          setLaunching(false);
          reject(err);
        };

        launchRejectRef.current = fail;

        const timeout = window.setTimeout(() => {
          fail(new Error('Tempo esgotado. Conclua o cadastro na janela da Meta e tente novamente.'));
        }, 120_000);

        const done = () => window.clearTimeout(timeout);

        flushHandlerRef.current = async (payload) => {
          done();
          try {
            await options.onComplete(payload);
            setLaunching(false);
            resolve();
          } catch (e) {
            fail(e instanceof Error ? e : new Error(String(e)));
          }
        };

        window.FB!.login(
          (response) => {
            if (response.authResponse?.code) {
              pendingRef.current.code = response.authResponse.code;
              void tryFlush().catch(fail);
            } else {
              done();
              fail(new Error('Cadastro cancelado ou não concluído.'));
            }
          },
          {
            config_id: cfg.config_id,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {},
              sessionInfoVersion: '3',
              ...(options.coexistence
                ? { featureType: 'whatsapp_business_app_onboarding' }
                : {}),
            },
          },
        );
      });
    },
    [config, tryFlush],
  );

  return {
    config,
    sdkReady,
    launching,
    reloadConfig: loadConfig,
    launch,
  };
}
