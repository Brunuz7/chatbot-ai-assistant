/** Garante cor de etiqueta dentro da paleta permitida. */
export function pickAllowedColor<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const c = (raw?.trim() || fallback) as T;
  return allowed.includes(c) ? c : fallback;
}
