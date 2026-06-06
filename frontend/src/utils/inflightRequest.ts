/** Evita pedidos HTTP duplicados em paralelo (ex.: React StrictMode em dev). */
export function createInflightRequest<T>() {
  let inflight: Promise<T> | null = null;

  return {
    run(factory: () => Promise<T>, force = false): Promise<T> {
      if (!force && inflight) return inflight;
      inflight = factory().finally(() => {
        inflight = null;
      });
      return inflight;
    },
    clear() {
      inflight = null;
    },
  };
}
