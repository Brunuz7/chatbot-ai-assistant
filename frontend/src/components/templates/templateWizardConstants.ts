import type { LucideIcon } from 'lucide-react';
import {
  Megaphone,
  Bell,
  Shield,
  Ban,
  Type,
  ImageIcon,
  Film,
  FileIcon,
  MessageSquare,
  Link2,
  ClipboardList,
  LayoutTemplate,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import type { TemplateButtonMode, TemplateHeaderMode, WhatsAppTemplateCategory } from '../../types/whatsappTemplate';

export type TemplateCategoryOption = {
  id: WhatsAppTemplateCategory;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export type TemplateHeaderOption = {
  id: TemplateHeaderMode;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export type TemplateButtonOption = {
  id: TemplateButtonMode;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export const TEMPLATE_CATEGORY_OPTIONS: TemplateCategoryOption[] = [
  {
    id: 'MARKETING',
    title: 'Marketing',
    description: 'Promoções e novidades',
    icon: Megaphone,
    accent: 'blue',
  },
  {
    id: 'UTILITY',
    title: 'Utilidade',
    description: 'Avisos e confirmações',
    icon: Bell,
    accent: 'teal',
  },
  {
    id: 'AUTHENTICATION',
    title: 'Autenticação',
    description: 'Código OTP por WhatsApp',
    icon: Shield,
    accent: 'orange',
  },
];

export const TEMPLATE_HEADER_OPTIONS: TemplateHeaderOption[] = [
  { id: 'none', title: 'Nenhum', description: 'Só corpo e rodapé', icon: Ban, accent: 'slate' },
  { id: 'text', title: 'Texto', description: 'Título curto no topo', icon: Type, accent: 'blue' },
  { id: 'image', title: 'Imagem', description: 'JPEG ou PNG', icon: ImageIcon, accent: 'violet' },
  { id: 'video', title: 'Vídeo', description: 'MP4', icon: Film, accent: 'purple' },
  { id: 'document', title: 'PDF', description: 'Documento anexo', icon: FileIcon, accent: 'slate' },
];

export const TEMPLATE_BUTTON_OPTIONS: TemplateButtonOption[] = [
  { id: 'none', title: 'Sem botões', description: 'Apenas texto', icon: Ban, accent: 'slate' },
  {
    id: 'QUICK_REPLY',
    title: 'Respostas rápidas',
    description: 'Até 3 opções tocáveis',
    icon: MessageSquare,
    accent: 'emerald',
  },
  {
    id: 'CALL_TO_ACTION',
    title: 'Link ou telefone',
    description: 'Site ou chamada',
    icon: Link2,
    accent: 'blue',
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<WhatsAppTemplateCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

export const TEMPLATE_HEADER_LABELS: Record<TemplateHeaderMode, string> = {
  none: 'Sem cabeçalho',
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  document: 'PDF',
};

export const TEMPLATE_BUTTON_LABELS: Record<TemplateButtonMode, string> = {
  none: 'Sem botões',
  QUICK_REPLY: 'Respostas rápidas',
  CALL_TO_ACTION: 'Link ou telefone',
};

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
  slate: {
    icon: 'text-slate-600 bg-slate-500/10 dark:text-slate-400',
    selected: 'border-slate-400/50 bg-slate-500/[0.08] dark:bg-slate-500/10',
    ring: 'ring-slate-400/25',
  },
};

export function getTemplateAccentStyles(accent: string) {
  return ACCENT_STYLES[accent] ?? ACCENT_STYLES.slate;
}

export const TEMPLATE_WIZARD_ICONS = {
  basic: ClipboardList,
  content: LayoutTemplate,
  buttons: MousePointerClick,
  review: Sparkles,
} as const;
