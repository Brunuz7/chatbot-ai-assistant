export function maskToken(token: string | null | undefined): string | null {
  if (!token || token.length < 8) return null;
  return `••••${token.slice(-4)}`;
}
