/** Identidade fixa da app (HTML + cliente). Não vem do .env. */
export const APP_META_STATIC = {
  title: 'Assistente Prestei',
  shortTitle: 'Prestei',
  siteName: 'Assistente Prestei',
  description:
    'Assistente inteligente para WhatsApp: fluxos, agentes de IA e automação.',
  keywords: 'whatsapp,chatbot,automação,ia,prestei',
  author: 'Prestei',
  themeColor: '#175197',
  favicon: '/favicon.svg',
  ogImagePath: '/og-image.png',
  locale: 'pt_BR',
  twitterCard: 'summary_large_image' as const,
  robots: 'index, follow',
} as const;
