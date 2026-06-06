import type { LucideIcon } from 'lucide-react';
import { BarChart3, HelpCircle, MessageSquare, Package, ShieldCheck, Zap } from 'lucide-react';

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type LandingStep = {
  step: string;
  title: string;
  description: string;
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: Zap,
    title: 'Fluxos de atendimento',
    description: 'Monte jornadas de conversa para orientar e responder clientes de forma automática.',
  },
  {
    icon: HelpCircle,
    title: 'Dúvidas frequentes',
    description: 'Responda perguntas recorrentes com agilidade, sem repetir as mesmas informações.',
  },
  {
    icon: Package,
    title: 'Produtos e serviços',
    description: 'Disponibilize informações sobre o que sua empresa oferece diretamente no WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'Acompanhamento',
    description: 'Visualize e gerencie as interações realizadas com seus contatos em um só lugar.',
  },
];

export const LANDING_STEPS: LandingStep[] = [
  {
    step: '01',
    title: 'Conecte seu WhatsApp',
    description: 'A empresa vincula o canal oficial e configura o assistente na plataforma.',
  },
  {
    step: '02',
    title: 'Configure o atendimento',
    description: 'Cria fluxos, respostas automáticas e conteúdos para atender seus clientes.',
  },
  {
    step: '03',
    title: 'Atenda e acompanhe',
    description: 'As conversas são processadas e as interações ficam disponíveis para gestão.',
  },
];

export const LANDING_DATA_POINTS = [
  {
    icon: MessageSquare,
    title: 'Mensagens recebidas',
    description: 'Processadas para responder solicitações e manter o histórico da conversa.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados de contato',
    description: 'Utilizados para identificar contatos e personalizar o atendimento.',
  },
  {
    icon: BarChart3,
    title: 'Status de entrega',
    description: 'Consultados para confirmar o envio e a entrega das mensagens.',
  },
];
