import { isAxiosError } from 'axios';

const GENERIC = 'Não foi possível concluir a operação. Tente novamente.';

/** Erros conhecidos da API (inglês legado ou códigos) → mensagem para o utilizador. */
const KNOWN: Record<string, string> = {
  'Agent not found': 'Agente não encontrado.',
  'Flow not found': 'Roteiro não encontrado.',
};

function isTechnicalMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('cannot read') ||
    m.includes('undefined') ||
    m.includes('typeerror') ||
    m.includes('prisma') ||
    m.includes('econnrefused') ||
    m.includes('socket hang up')
  );
}

/**
 * Extrai mensagem segura para mostrar ao utilizador (toast, alertas).
 * Evita expor detalhes técnicos de stack ou do motor.
 */
export function getApiErrorMessage(error: unknown, fallback: string = GENERIC): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      const errField = rec.error;
      const msgField = rec.message;
      const raw =
        typeof errField === 'string'
          ? errField.trim()
          : typeof msgField === 'string'
            ? msgField.trim()
            : '';
      if (raw) {
        if (KNOWN[raw]) return KNOWN[raw];
        if (isTechnicalMessage(raw)) return fallback;
        return raw;
      }
    }

    if (status === 404) return 'Recurso não encontrado.';
    if (status === 401) return 'Sessão expirada. Inicie sessão novamente.';
    if (status === 403) return 'Não tem permissão para esta ação.';
    return fallback;
  }

  if (error instanceof Error && error.message && !isTechnicalMessage(error.message)) {
    return error.message;
  }

  return fallback;
}
