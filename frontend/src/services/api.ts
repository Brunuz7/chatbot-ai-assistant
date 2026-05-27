import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders
} from 'axios';

function normalizeApiBaseUrl(url?: string): string {
  let trimmed = (url || 'http://localhost:3001').replace(/\/+$/, '');
  // Remove sufixos /api repetidos (evita pedidos a .../api/api/... quando o .env inclui /api)
  trimmed = trimmed.replace(/(\/api)+$/, '');
  return trimmed;
}

/** Em desenvolvimento, usar mesma origem do Vite: o proxy encaminha /api e evita "Network Error" por CORS (localhost vs 127.0.0.1). */
function resolveApiBaseURL(): string {
  if (import.meta.env.DEV) {
    return '';
  }
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}
/*
-----------------------------------
 INSTÂNCIA AXIOS
-----------------------------------
*/
const api = axios.create({
  baseURL: resolveApiBaseURL(),
  withCredentials: true
});

/*
-----------------------------------
 EXTENDENDO CONFIG DO AXIOS
Para aceitar _retry sem erro TS
-----------------------------------
*/
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/*
-----------------------------------
 LIMPAR SESSÃO
-----------------------------------
*/
function clearSession() {
  localStorage.removeItem('token');
}

/*
-----------------------------------
 REDIRECIONAR LOGIN
-----------------------------------
*/
function redirectToLogin() {
  window.location.href = '/entrar';
}

/*
-----------------------------------
 REFRESH CONTROLADO
Evita múltiplas chamadas simultâneas
-----------------------------------
*/
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/api/auth/refresh')
      .then((response) => {
        const newToken = response.data?.accessToken;

        if (!newToken) {
          clearSession();
          return null;
        }

        localStorage.setItem('token', newToken);

        return newToken;
      })
      .catch((err) => {
        console.error('Erro ao renovar token:', err);
        clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/*
-----------------------------------
 REQUEST INTERCEPTOR
Adiciona token automaticamente
-----------------------------------
*/
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || ({} as AxiosRequestHeaders);
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
-----------------------------------
 RESPONSE INTERCEPTOR
Trata token expirado
-----------------------------------
*/
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as CustomAxiosRequestConfig;

    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthRequest =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/logout');

    /*
    Se token expirar:
    tenta refresh uma única vez
    */
    if (
      status === 401 &&
      !isAuthRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        originalRequest.headers =
          originalRequest.headers ||
          ({} as AxiosRequestHeaders);

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);
      }

      /*
      refresh falhou
      */
      clearSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;