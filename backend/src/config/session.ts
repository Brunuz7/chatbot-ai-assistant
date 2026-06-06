/** Duração da sessão (refresh token + cookie httpOnly). */
export const SESSION_REFRESH_DAYS = Math.max(
  1,
  Number.parseInt(process.env.SESSION_REFRESH_DAYS ?? '30', 10) || 30,
);

export const REFRESH_TOKEN_MAX_AGE_MS = SESSION_REFRESH_DAYS * 24 * 60 * 60 * 1000;

export const REFRESH_TOKEN_EXPIRES_IN = `${SESSION_REFRESH_DAYS}d` as const;

/** Access token curto; a sessão longa fica no refresh (cookie). */
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES ?? '1h';
