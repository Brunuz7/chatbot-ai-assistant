import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  Mic,
  Clock,
  GitBranch,
  Brain,
  AudioLines,
  Split,
  UserCheck,
  Play,
  MessagesSquare,
  Inbox,
  ClipboardList,
  Target,
  Zap,
  Settings2,
  ArrowRight,
} from 'lucide-react';

export type FlowActionId =
  | 'send_message'
  | 'send_voice'
  | 'wait_reply'
  | 'goto'
  | 'interpret'
  | 'interpret_voice'
  | 'condition'
  | 'handover'
  | 'start';

export type FlowActionOption = {
  id: FlowActionId;
  title: string;
  description: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
};

export const FLOW_ACTION_OPTIONS: FlowActionOption[] = [
  {
    id: 'send_message',
    title: 'Mensagem',
    description: 'Texto fixo ao cliente',
    hint: 'Boas-vindas, avisos ou respostas prontas.',
    icon: MessageSquare,
    accent: 'blue',
  },
  {
    id: 'send_voice',
    title: 'Áudio',
    description: 'Voz sintetizada',
    hint: 'Voz em Configurações → Áudio.',
    icon: Mic,
    accent: 'violet',
  },
  {
    id: 'wait_reply',
    title: 'Aguardar',
    description: 'Pausa até o cliente responder',
    hint: 'Antes da próxima pergunta ou etapa.',
    icon: Clock,
    accent: 'purple',
  },
  {
    id: 'goto',
    title: 'Ir para fluxo',
    description: 'Salta para outra etapa',
    hint: 'Muda o caminho da conversa.',
    icon: GitBranch,
    accent: 'slate',
  },
  {
    id: 'interpret',
    title: 'IA (texto)',
    description: 'Resposta automática com IA',
    hint: 'Instruções opcionais abaixo.',
    icon: Brain,
    accent: 'emerald',
  },
  {
    id: 'interpret_voice',
    title: 'IA (áudio)',
    description: 'IA responde em voz',
    hint: 'Voz em Configurações → Áudio.',
    icon: AudioLines,
    accent: 'teal',
  },
  {
    id: 'condition',
    title: 'Se / senão',
    description: 'Ramifica por texto',
    hint: 'Ex.: «sim» → fluxo A, senão → B.',
    icon: Split,
    accent: 'orange',
  },
  {
    id: 'handover',
    title: 'Humano',
    description: 'Passa para atendente',
    hint: 'Bot para de responder sozinho.',
    icon: UserCheck,
    accent: 'red',
  },
];

export type EntryModeOption = {
  id: 'trigger' | 'always_idle';
  title: string;
  description: string;
  icon: LucideIcon;
};

export const ENTRY_MODE_OPTIONS: EntryModeOption[] = [
  {
    id: 'trigger',
    title: 'Por frase',
    description: 'Ativa quando a mensagem contiver frases definidas',
    icon: MessagesSquare,
  },
  {
    id: 'always_idle',
    title: 'Qualquer msg',
    description: 'Quando nenhum outro fluxo estiver ativo',
    icon: Inbox,
  },
];

export const FLOW_ACTION_START: FlowActionOption = {
  id: 'start',
  title: 'Início',
  description: 'Apenas liga ao próximo passo, sem enviar mensagem',
  hint: 'Para fluxos que só servem de ponto de partida.',
  icon: Play,
  accent: 'slate',
};

export const FLOW_TYPE_LABELS: Record<string, string> = {
  send_message: 'Enviar mensagem',
  message: 'Enviar mensagem',
  send_voice: 'Enviar áudio',
  interpret: 'Responder com IA',
  interpret_voice: 'Responder em áudio',
  wait_reply: 'Aguardar resposta',
  goto: 'Ir para outro fluxo',
  condition: 'Condição',
  start: 'Início',
  handover: 'Transferir para humano',
};

export function getFlowActionOption(type: string): FlowActionOption | undefined {
  if (type === 'start') return FLOW_ACTION_START;
  return FLOW_ACTION_OPTIONS.find((a) => a.id === type);
}

const ACCENT_STYLES: Record<string, { icon: string; selected: string; ring: string }> = {
  blue: {
    icon: 'text-primary bg-primary-a10',
    selected: 'border-primary-a50 bg-primary-a10',
    ring: 'ring-primary-a25',
  },
  violet: {
    icon: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
    selected: 'border-violet-500/50 bg-violet-500/[0.08] dark:bg-violet-500/10',
    ring: 'ring-violet-500/25',
  },
  purple: {
    icon: 'text-purple-600 bg-purple-500/10 dark:text-purple-400',
    selected: 'border-purple-500/50 bg-purple-500/[0.08] dark:bg-purple-500/10',
    ring: 'ring-purple-500/25',
  },
  emerald: {
    icon: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
    selected: 'border-emerald-500/50 bg-emerald-500/[0.08] dark:bg-emerald-500/10',
    ring: 'ring-emerald-500/25',
  },
  teal: {
    icon: 'text-teal-600 bg-teal-500/10 dark:text-teal-400',
    selected: 'border-teal-500/50 bg-teal-500/[0.08] dark:bg-teal-500/10',
    ring: 'ring-teal-500/25',
  },
  orange: {
    icon: 'text-orange-600 bg-orange-500/10 dark:text-orange-400',
    selected: 'border-orange-500/50 bg-orange-500/[0.08] dark:bg-orange-500/10',
    ring: 'ring-orange-500/25',
  },
  red: {
    icon: 'text-red-600 bg-red-500/10 dark:text-red-400',
    selected: 'border-red-500/50 bg-red-500/[0.08] dark:bg-red-500/10',
    ring: 'ring-red-500/25',
  },
  slate: {
    icon: 'text-slate-600 bg-slate-500/10 dark:text-slate-400',
    selected: 'border-slate-400/50 bg-slate-500/[0.08] dark:bg-slate-500/10',
    ring: 'ring-slate-400/25',
  },
};

export function getActionAccentStyles(accent: string) {
  return ACCENT_STYLES[accent] ?? ACCENT_STYLES.slate;
}

/** Ícones dos cabeçalhos das secções do wizard de fluxo. */
export const WIZARD_SECTION_ICONS = {
  basic: ClipboardList,
  trigger: Target,
  action: Zap,
  details: Settings2,
  next: ArrowRight,
} as const;
