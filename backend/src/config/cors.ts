/** Origens permitidas (SPA). Várias URLs separadas por vírgula. */
export function corsOrigins(): string | string[] {
  const raw = (process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const base = raw.length > 0 ? raw : ['http://localhost:5173'];

  const expanded = new Set<string>();
  for (const o of base) {
    expanded.add(o);
    try {
      const u = new URL(o);
      if (u.hostname === 'localhost') {
        const alt = new URL(u.href);
        alt.hostname = '127.0.0.1';
        expanded.add(alt.origin);
      } else if (u.hostname === '127.0.0.1') {
        const alt = new URL(u.href);
        alt.hostname = 'localhost';
        expanded.add(alt.origin);
      }
    } catch {
      /* URL inválida no env — ignorar expansão */
    }
  }

  const list = [...expanded];
  return list.length === 1 ? list[0] : list;
}

export function warnMisconfiguredCors(apiPort: number): void {
  const origins = corsOrigins();
  const list = Array.isArray(origins) ? origins : [origins];
  const bad = list.filter((o) => {
    try {
      const u = new URL(o);
      return u.port === String(apiPort);
    } catch {
      return false;
    }
  });

  if (bad.length > 0) {
    console.warn(
      `⚠️ FRONTEND_ORIGIN aponta para a porta da API (${apiPort}): ${bad.join(', ')}. ` +
        'Use a URL do Vite (ex.: http://localhost:5173) ou o browser bloqueia pedidos e nada grava.',
    );
  }

  console.log('CORS origens permitidas:', list.join(', '));
}
