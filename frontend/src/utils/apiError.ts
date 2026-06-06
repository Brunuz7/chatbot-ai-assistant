import { isAxiosError } from 'axios';

const GENERIC = 'Não foi possível concluir a operação. Tente novamente.';

/** Erros conhecidos da API (inglês legado ou códigos) → mensagem para o utilizador. */
const KNOWN: Record<string, string> = {
  'Agent not found': 'Agente não encontrado.',
  'Flow not found': 'Roteiro não encontrado.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  invalid_input: 'Preencha e-mail e senha.',
  account_locked: 'Conta temporariamente bloqueada. Tente novamente mais tarde.',
  user_exists: 'Já existe uma conta com este e-mail.',
  qrcode_indisponivel: 'Não foi possível gerar o QR Code. Aguarde alguns segundos e tente novamente.',
  whatsapp_nao_configurado: 'Ligação WhatsApp não está configurada no servidor. Contacte o suporte.',
  whatsapp_servico_indisponivel:
    'Serviço WhatsApp temporariamente indisponível. Verifique se a Evolution API está ativa e com a mesma chave do backend.',
  usuario_nao_encontrado: 'Utilizador não encontrado.',
};

function isTechnicalMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('cannot read') ||
    m.includes('undefined') ||
    m.includes('typeerror') ||
    m.includes('prisma') ||
    m.includes('econnrefused') ||
    m.includes('socket hang up') ||
    m.includes('internal server') ||
    m.includes('failed to get') ||
    m.includes('failed to fetch') ||
    m.includes('qrcode') ||
    m.includes('network error') ||
    m === 'error' ||
    /^[a-z]+error$/i.test(m.replace(/\s/g, ''))
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
      const raw = typeof errField === 'string' ? errField.trim() : typeof msgField === 'string' ? msgField.trim() : '';
      if (raw) {
        if (KNOWN[raw]) return KNOWN[raw];
        if (isTechnicalMessage(raw)) return fallback;
        return raw;
      }
    }

    if (status === 404) return 'Recurso não encontrado.';
    if (status === 401) return 'Sessão expirada. Inicie sessão novamente.';
    if (status === 403) return 'Não tem permissão para esta ação.';
    if (status === 423) return KNOWN.account_locked;
    if (status && status >= 500) return fallback;
    return fallback;
  }

  if (error instanceof Error && error.message && !isTechnicalMessage(error.message)) return error.message;

  return fallback;
}
