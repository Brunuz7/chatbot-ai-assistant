const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function extractQrFromEvolutionPayload(data: unknown): { base64?: string; code?: string } {
  if (!data || typeof data !== 'object') return {};

  const record = data as Record<string, unknown>;
  if (record.error === true) return {};

  const nested =
    record.qrcode && typeof record.qrcode === 'object'
      ? (record.qrcode as Record<string, unknown>)
      : record;

  const base64 = typeof nested.base64 === 'string' ? nested.base64 : undefined;
  const code = typeof nested.code === 'string' ? nested.code : undefined;

  return { base64, code };
}

export function evolutionHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

export async function waitForEvolutionQr(
  fetchConnect: () => Promise<unknown>,
  options?: { attempts?: number; intervalMs?: number },
): Promise<{ base64: string; code?: string }> {
  const attempts = options?.attempts ?? 6;
  const intervalMs = options?.intervalMs ?? 1500;

  for (let i = 0; i < attempts; i++) {
    const data = await fetchConnect();
    const { base64, code } = extractQrFromEvolutionPayload(data);
    if (base64) return { base64, code };

    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    const state =
      (record?.instance as Record<string, unknown> | undefined)?.state ??
      (record?.instance as Record<string, unknown> | undefined)?.status;

    if (state === 'open') {
      throw new Error('already_connected');
    }

    if (i < attempts - 1) await delay(intervalMs);
  }

  throw new Error('qrcode_unavailable');
}
