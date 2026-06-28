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
  meta_app_not_configured:
    'Integração Meta não configurada no servidor. Defina META_APP_ID e META_APP_SECRET no .env e reinicie o backend.',
  token_exchange_failed:
    'A Meta recusou a validação do cadastro. Clique em Conectar novamente e conclua o fluxo sem fechar a janela.',
  missing_signup_payload: 'Dados do cadastro incompletos. Tente conectar novamente.',
  connection_not_found: 'Conexão não encontrada. Clique em Conectar para iniciar o cadastro.',
  plan_limit_agents: 'Limite de agentes do seu plano atingido. Faça upgrade para criar mais.',
  plan_limit_flows: 'Limite de fluxos do seu plano atingido. Faça upgrade para criar mais.',
  plan_limit_knowledge_bases: 'Limite de bases de conhecimento do seu plano atingido. Faça upgrade para criar mais.',
  plan_feature_bulk_messaging: 'Disparador em massa não está incluído no seu plano.',
  plan_feature_lead_qualification: 'Qualificação de lead não está incluída no seu plano.',
  plan_feature_trained_ai: 'IA treinada não está incluída no seu plano.',
  plan_feature_smart_summary: 'Resumo inteligente não está incluído no seu plano.',
  plan_feature_audio_to_text: 'Áudio convertido em texto não está incluído no seu plano.',
  plan_feature_whatsapp_recovery: 'Recuperação de clientes no WhatsApp não está incluída no seu plano.',
  plan_feature_exclusive_support: 'Atendimento exclusivo disponível apenas no plano EXCLUSIVO.',
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
      const codeField = rec.code;
      const errField = rec.error;
      const msgField = rec.message;
      const code = typeof codeField === 'string' ? codeField.trim() : '';
      if (code && KNOWN[code]) return KNOWN[code];

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
