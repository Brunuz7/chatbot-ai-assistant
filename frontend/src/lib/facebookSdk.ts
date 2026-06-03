const SDK_ID = 'facebook-jssdk';
const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

export type FacebookInitOptions = {
  appId: string;
  autoLogAppEvents?: boolean;
  xfbml?: boolean;
  version: string;
};

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: FacebookInitOptions) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function isFacebookSdkInjected(): boolean {
  return Boolean(document.getElementById(SDK_ID));
}

/** Aguarda o SDK injetado no HTML (fbAsyncInit + facebook-jssdk). */
export function waitForFacebookSdk(timeoutMs = 30_000): Promise<void> {
  if (window.FB) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (window.FB) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error('Não foi possível carregar o SDK da Meta.'));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

/** Fallback quando META_APP_ID não está no .env (sem injeção no index.html). */
export function loadFacebookSdkFallback(opts: FacebookInitOptions): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (isFacebookSdkInjected()) return waitForFacebookSdk();

  return new Promise((resolve, reject) => {
    const prior = window.fbAsyncInit;
    window.fbAsyncInit = function () {
      prior?.();
      window.FB?.init({
        appId: opts.appId,
        autoLogAppEvents: opts.autoLogAppEvents ?? true,
        xfbml: opts.xfbml ?? true,
        version: opts.version,
      });
      resolve();
    };

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.async = true;
    script.defer = true;
    script.src = SDK_SRC;
    script.onerror = () => reject(new Error('Não foi possível carregar o SDK da Meta.'));
    const first = document.getElementsByTagName('script')[0];
    if (first?.parentNode) {
      first.parentNode.insertBefore(script, first);
    } else {
      document.body.appendChild(script);
    }
  });
}

export async function ensureFacebookSdk(opts: FacebookInitOptions): Promise<void> {
  if (isFacebookSdkInjected()) {
    await waitForFacebookSdk();
    return;
  }
  await loadFacebookSdkFallback(opts);
}
