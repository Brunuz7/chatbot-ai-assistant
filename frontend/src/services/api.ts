import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from "axios";

function normalizeApiBaseUrl(url?: string): string {
  const trimmed = (
    url || "http://localhost:3001"
  ).replace(/\/+$/, "");

  return trimmed.replace(/\/api$/, "");
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(
    import.meta.env.VITE_API_URL
  ),
});

/*
===================================
 TYPES
===================================
*/
interface CustomAxiosRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/*
===================================
 CLEAR SESSION
===================================
*/
function clearSession() {
  localStorage.removeItem("token");
}

/*
===================================
 REDIRECT LOGIN
===================================
*/
function redirectToLogin() {
  window.location.href = "/login";
}

/*
===================================
 REFRESH TOKEN
===================================
*/
let refreshPromise: Promise<string | null> | null =
  null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/api/auth/refresh")
      .then((response) => {
        const newToken =
          response.data?.accessToken;

        if (!newToken) {
          clearSession();
          return null;
        }

        localStorage.setItem(
          "token",
          newToken
        );

        return newToken;
      })
      .catch((err) => {
        console.error(
          "Erro ao renovar token:",
          err
        );

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
===================================
 REQUEST INTERCEPTOR
===================================
*/
api.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig
  ) => {
    const token =
      localStorage.getItem("token");

    console.log("TOKEN ENVIADO:", token);

    if (token) {
      config.headers =
        config.headers ||
        ({} as AxiosRequestHeaders);

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
===================================
 RESPONSE INTERCEPTOR
===================================
*/
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as CustomAxiosRequestConfig;

    const status =
      error.response?.status;

    const url =
      originalRequest?.url || "";

    const isAuthRequest =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/register") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/logout");

    if (
      status === 401 &&
      !isAuthRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const newToken =
        await refreshAccessToken();

      if (newToken) {
        originalRequest.headers =
          originalRequest.headers ||
          ({} as AxiosRequestHeaders);

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);
      }

      clearSession();

      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;