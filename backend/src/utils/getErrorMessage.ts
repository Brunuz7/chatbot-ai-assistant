import axios from 'axios';

type AxiosErrorBody = {
  error?: { message?: string; error_user_msg?: string };
  message?: string;
};

/** Extrai mensagem legível de qualquer erro (Axios, Error, string, unknown). */
export function getErrorMessage(err: unknown, fallback = 'Erro desconhecido'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as AxiosErrorBody | undefined;
    return data?.error?.error_user_msg || data?.error?.message || data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
