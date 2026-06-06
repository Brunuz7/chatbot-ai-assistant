import type { Agent } from '@prisma/client';

export type InterpretSystemPromptParams = {
  sistemaGlobal: string;
  agent: Agent | null;
  flowName: string;
  flowSummary: string;
  instruction: string;
  knowledgeBlock: string;
  historyBlock: string;
};

export const emptyCurrentMessage = '(mensagem vazia)';
export const emptyHistory = '(Sem mensagens anteriores registradas nesta conversa.)';
export const emptyGlobalInstructions = '(Nenhuma instrução global cadastrada para esta empresa.)';
export const audioUntranscribedHistory = '[áudio sem transcrição]';
export const mediaOtherHistory = 'Mídia/Outro';
export const audioUntranscribedFlowInstruction =
  'O cliente enviou uma mensagem de áudio que não foi possível transcrever. Peça educadamente para repetir ou escrever.';

export const interpretDefaultInstruction =
  'Responda a mensagem do usuário de forma útil, objetiva e cordial.';
export const interpretBehavior =
  'Comportamento: responda apenas com texto pronto para enviar ao cliente no WhatsApp, em português do Brasil. ' +
  'Se o facto pedido não aparecer na base de conhecimento, diga claramente que não há esse dado cadastrado — não invente.';
export const interpretEmptyReply =
  'Desculpe, não consegui gerar uma resposta agora. Pode repetir a sua mensagem?';
export const interpretErrorReply = 'Desculpe, ocorreu um erro ao gerar a resposta.';
export const interpretOpenRouterKeyMissing = 'Erro de configuração: OPENROUTER_API_KEY ausente.';
export const handoverDefault = 'Um atendente humano dará continuidade em instantes.';
export const flowNoEntryInstruction = '(Sem instrução de início — use o nome do fluxo.)';

export const sectionSistemaGlobal = '[SISTEMA GLOBAL]';
export const sectionAgente = '[AGENTE (opcional)]';
export const sectionFluxoAtivo = '[FLUXO ATIVO]';
export const sectionBaseConhecimento = '[BASE DE CONHECIMENTO]';
export const sectionHistoricoRecente = '[HISTÓRICO RECENTE]';
export const sectionMensagemAtual = '[MENSAGEM ATUAL]';
export const sectionTagsDisponiveis = '[TAGS DISPONÍVEIS]';
export const sectionMensagemActualCliente = '[MENSAGEM ACTUAL DO CLIENTE]';

export const flowRouterSystem =
  'Você é um roteador de fluxos de atendimento no WhatsApp.\n' +
  'Cada fluxo tem `entry_instruction`: critério em linguagem natural que descreve QUANDO esse fluxo deve iniciar.\n' +
  'Com base na mensagem actual do cliente, escolha APENAS o fluxo cuja instrução de início melhor se aplica.\n' +
  'Use `priority` (número maior = preferência em empate) só como desempate.\n' +
  'Responda SOMENTE JSON válido: {"selected_flow_id":"<id>"}.\n' +
  'Se nenhum fluxo for adequado, responda: {"selected_flow_id":null}.';

export const tagClassifierSystem =
  'Você é um assistente de classificação de contatos em atendimento por WhatsApp.\n' +
  'Com base no histórico recente e na mensagem actual do cliente, escolha UMA tag que melhor descreve a intenção e estágio do contacto neste momento.\n' +
  'Considere todo o contexto da conversa, não apenas a última frase isolada.\n' +
  'Responda SOMENTE JSON válido: {"selected_tag_id":"<id>"}.\n' +
  'Se nenhuma tag for adequada, responda: {"selected_tag_id":null}.';

export const knowledgeEmpty = '(Nenhum artigo cadastrado na base de conhecimento para esta conta.)';
export const knowledgeTruncated = '\n[… mais artigos omitidos por limite de tamanho do contexto …]\n';
export const knowledgeExtractFailed =
  '(Não foi possível incluir trechos — tente reduzir o tamanho dos artigos.)';

export const storeCatalogHint =
  'Catálogo da loja integrada:\n' +
  '- Sobre produtos, use SOMENTE o nome, preço e descrição de cada item tal como aparecem no catálogo abaixo. ' +
  'Não invente, complete nem infira cor, tamanho, material, estoque, prazo, garantia ou qualquer detalhe que não esteja escrito.\n' +
  '- Se o cliente perguntar algo que não consta no nome ou na descrição, diga claramente que essa informação não está cadastrada.\n' +
  '- Fotos automáticas no WhatsApp: quando o cliente pedir categoria, tipo ou produto concreto e você citar produtos, ' +
  'copie o marcador [id:...] exato de cada um (ex.: «Camiseta Basic [id:abc-123] — R$ 49,90»).\n' +
  '- Pedidos genéricos («o que vendem?», «manda tudo», «catálogo completo») → responda só em texto, SEM [id:...].\n' +
  '- Máximo 5 produtos com [id:...] por mensagem. Nunca marque o catálogo inteiro.\n' +
  '- Não inclua URLs nem avise que enviará imagens.\n\n';

export const storeCatalogEmpty = '(Catálogo vazio.)';
export const storeCatalogHeader =
  'Produtos cadastrados — use apenas nome, preço e descrição de cada item; não acrescente dados que não estejam aqui:\n\n';

export function formatHistoryBlock(entries: { role: 'user' | 'assistant'; content: string }[]): string {
  if (!entries.length) return emptyHistory;
  return entries
    .map((m) => (m.role === 'user' ? `Cliente: ${m.content}` : `Assistente: ${m.content}`))
    .join('\n');
}

export function buildAgentBlock(agent: Agent): string {
  return (
    `${sectionAgente}\n` +
    `${agent.name.trim()}\n` +
    `Papel (role): ${agent.role.trim()}\n` +
    `Objetivo: ${agent.objective.trim()}\n` +
    `${agent.instructions.trim()}\n\n`
  );
}

export function buildInterpretSystemPrompt(params: InterpretSystemPromptParams): string {
  const agentBlock = params.agent ? buildAgentBlock(params.agent) : '';
  return (
    `${interpretBehavior}\n\n` +
    `${sectionSistemaGlobal}\n` +
    `${params.sistemaGlobal}\n\n` +
    agentBlock +
    `${sectionFluxoAtivo}\n` +
    `${params.flowName.trim()}\n` +
    `${params.flowSummary}\n\n${params.instruction.trim()}\n\n` +
    `${sectionBaseConhecimento}\n` +
    `${params.knowledgeBlock.trim()}\n\n` +
    `${sectionHistoricoRecente}\n` +
    params.historyBlock
  );
}

export function buildInterpretUserMessage(currentText: string): string {
  return `${sectionMensagemAtual}\n${currentText}`;
}

export function buildFlowRouterUserMessage(incomingText: string, flows: unknown): string {
  return `Mensagem do usuário:\n${incomingText}\n\nFluxos disponíveis (JSON):\n${JSON.stringify(flows)}`;
}

export function buildTagClassifierUserMessage(
  tags: { id: string; name: string; description: string | null }[],
  historyBlock: string,
  currentMessage: string,
): string {
  const tagsForPrompt = tags.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description?.trim() || null,
  }));

  return (
    `${sectionTagsDisponiveis}\n${JSON.stringify(tagsForPrompt, null, 2)}\n\n` +
    `${sectionHistoricoRecente}\n${historyBlock}\n\n` +
    `${sectionMensagemActualCliente}\n${currentMessage}`
  );
}

export function formatStoreCatalogBody(productLines: string): string {
  return `${storeCatalogHint}${storeCatalogHeader}${productLines}`;
}
