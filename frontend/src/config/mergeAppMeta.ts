import { APP_META_STATIC } from './appMetaStatic';

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
  ogImageMime: string;
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

function guessOgImageMime(imageUrl: string): string {
  const pathOnly = imageUrl.split('?')[0].toLowerCase();
  if (pathOnly.endsWith('.jpg') || pathOnly.endsWith('.jpeg')) return 'image/jpeg';
  if (pathOnly.endsWith('.webp')) return 'image/webp';
  if (pathOnly.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

export function mergeAppMetaFromEnv(env?: Record<string, string | undefined>): AppMeta {
  const e = env ?? {};
  const s = APP_META_STATIC;

  const baseUrl = stripTrailingSlash(e.VITE_APP_URL || 'http://localhost:5173');
  const ogImage = resolvePublicUrl(baseUrl, s.ogImagePath);

  return {
    title: s.title,
    shortTitle: s.shortTitle,
    description: s.description,
    keywords: s.keywords,
    author: s.author,
    themeColor: s.themeColor,
    baseUrl,
    favicon: s.favicon,
    appleTouchIcon: s.favicon,
    ogImage,
    ogImageMime: guessOgImageMime(ogImage),
    locale: s.locale,
    siteName: s.siteName,
    twitterCard: s.twitterCard,
    robots: s.robots,
  };
}
