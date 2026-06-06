export function decodeAccessTokenPayload(token: string): { exp?: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
  } catch {
    return null;
  }
}

/** Access token ainda aceite (com margem de 30s). */
export function isAccessTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeAccessTokenPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 > Date.now() + 30_000;
}

/** Renovar em background quando faltam menos de 5 minutos. */
export function shouldRefreshAccessToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const payload = decodeAccessTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + 5 * 60_000;
}
