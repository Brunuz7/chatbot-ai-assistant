import type { AxiosResponse } from 'axios';

/** Normaliza `Content-Type` de headers Axios para string (sem parâmetros como charset). */
export function axiosContentType(headers: AxiosResponse['headers']): string {
  const raw = headers['content-type'];
  if (raw == null || raw === false) return '';
  const joined =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw.filter(Boolean).join(', ')
        : String(raw);
  const base = joined.split(';')[0];
  return base ? base.trim() : '';
}
