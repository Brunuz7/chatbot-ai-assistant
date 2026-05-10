export type AppMeta = {
  title: string;
  shortTitle: string;
  description: string;
  keywords: string;
  author: string;
  themeColor: string;
  baseUrl: string;
  favicon: string;
  appleTouchIcon: string;
  ogImage: string;
  locale: string;
  siteName: string;
  twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
  robots: string;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolvePublicUrl(baseUrl: string, asset: string): string {
  if (asset.startsWith('http://') || asset.startsWith('https://')) return asset;
  const p = asset.startsWith('/') ? asset : `/${asset}`;
  return `${stripTrailingSlash(baseUrl)}${p}`;
}

/** Usado no build (vite) e no cliente; mesma lógica de defaults. */
export function mergeAppMetaFromEnv(env?: Record<string, string | undefined>): AppMeta {
  const e = env ?? {};
  const baseUrl = stripTrailingSlash(
    e.VITE_APP_URL || e.VITE_API_URL || 'http://localhost:5173',
  );
  const favicon = e.VITE_APP_FAVICON || '/favicon.svg';
  const title = e.VITE_APP_TITLE || 'Assistente Prestei';
  const shortTitle = e.VITE_APP_SHORT_TITLE || title.slice(0, 28);

  /** PNG/JPEG recomendado: WhatsApp, Facebook e LinkedIn ignoram ou falham com SVG em pré-visualizações. */
  const ogImageRaw = e.VITE_APP_OG_IMAGE?.trim();
  const ogImageDefault = '/og-image.png';
  const ogImage = ogImageRaw
    ? resolvePublicUrl(baseUrl, ogImageRaw)
    : resolvePublicUrl(baseUrl, ogImageDefault);

  const apple = e.VITE_APP_APPLE_TOUCH_ICON?.trim() || favicon;

  const tc = e.VITE_APP_TWITTER_CARD || 'summary_large_image';
  const twitterCard: AppMeta['twitterCard'] =
    tc === 'summary' ||
    tc === 'summary_large_image' ||
    tc === 'app' ||
    tc === 'player'
      ? tc
      : 'summary_large_image';

  return {
    title,
    shortTitle,
    description:
      e.VITE_APP_DESCRIPTION ||
      'Assistente inteligente para WhatsApp: fluxos, agentes de IA e automação.',
    keywords:
      e.VITE_APP_KEYWORDS ||
      'whatsapp, chatbot, automação, inteligência artificial, prestei',
    author: e.VITE_APP_AUTHOR || 'Prestei',
    themeColor: e.VITE_APP_THEME_COLOR || '#175197',
    baseUrl,
    favicon,
    appleTouchIcon: apple,
    ogImage,
    locale: (e.VITE_APP_LOCALE || 'pt_BR').replace(/-/g, '_'),
    siteName: e.VITE_APP_SITE_NAME || title,
    twitterCard,
    robots: e.VITE_APP_ROBOTS || 'index, follow',
  };
}
