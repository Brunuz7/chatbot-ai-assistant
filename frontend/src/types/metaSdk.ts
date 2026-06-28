export type MetaFbLoginResponse = {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
  };
  status?: string;
};

export type MetaFbStatic = {
  init: (params: {
    appId: string;
    autoLogAppEvents?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  login: (callback: (response: MetaFbLoginResponse) => void, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    FB?: MetaFbStatic;
    fbAsyncInit?: () => void;
  }
}

export {};
