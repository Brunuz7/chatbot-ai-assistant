import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, '..');
const plansConfig = path.resolve(__dirname, '../backend/src/config/plans.ts');

const APP_BASE_URL_PLACEHOLDER = '__APP_BASE_URL__';

type AppMeta = {
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

function buildAppMeta(env: Record<string, string | undefined>): AppMeta {
  const baseUrl = (env.VITE_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const ogImage = `${baseUrl}/og-image.png`;
  const ogPath = ogImage.split('?')[0].toLowerCase();

  return {
    title: 'Assistente Prestei',
    shortTitle: 'Prestei',
    siteName: 'Assistente Prestei',
    description: 'Assistente inteligente para WhatsApp: fluxos, agentes de IA e automação.',
    keywords: 'whatsapp,chatbot,automação,ia,prestei',
    author: 'Prestei',
    themeColor: '#1b17ff',
    baseUrl,
    favicon: '/favicon.svg',
    appleTouchIcon: '/favicon.svg',
    ogImage,
    ogImageMime: ogPath.endsWith('.webp')
      ? 'image/webp'
      : ogPath.endsWith('.gif')
        ? 'image/gif'
        : ogPath.endsWith('.jpg') || ogPath.endsWith('.jpeg')
          ? 'image/jpeg'
          : 'image/png',
    locale: 'pt_BR',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
  };
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectBaseUrl(html: string, baseUrl: string): string {
  const safe = escapeHtmlAttr(baseUrl);
  return html.split(APP_BASE_URL_PLACEHOLDER).join(safe);
}

function injectMetaAppId(html: string, appId: string): string {
  const safe = escapeHtmlAttr(appId || '26961034173555672');
  return html.split('__META_APP_ID__').join(safe);
}

function buildWebManifest(meta: AppMeta): Record<string, unknown> {
  return {
    name: meta.siteName,
    short_name: meta.shortTitle,
    description: meta.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: meta.themeColor,
    lang: meta.locale.replace(/_/g, '-'),
    icons: [
      {
        src: meta.favicon,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}

function webManifestBody(meta: AppMeta): string {
  return `${JSON.stringify(buildWebManifest(meta), null, 2)}\n`;
}

function appMetaPlugin(meta: AppMeta, loaded: Record<string, string | undefined>): import('vite').Plugin {
  return {
    name: 'app-meta-html',
    transformIndexHtml(html) {
      return injectMetaAppId(injectBaseUrl(html, meta.baseUrl), loaded.VITE_META_APP_ID ?? '');
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/site.webmanifest') {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(webManifestBody(meta));
      });
    },
    writeBundle(options) {
      const dir = options.dir;
      if (!dir) return;
      fs.writeFileSync(path.join(dir, 'site.webmanifest'), webManifestBody(meta), 'utf8');
    },
  };
}

export default defineConfig(({ mode }) => {
  // NODE_ENV=production no .env raiz quebra o Fast Refresh do React no Vite dev.
  if (mode === 'development') {
    process.env.NODE_ENV = 'development';
  }

  const loaded = loadEnv(mode, envDir, '');
  const meta = buildAppMeta(loaded);

  return {
    envDir,
    plugins: [react(), appMetaPlugin(meta, loaded)],
    resolve: {
      alias: {
        '@plans': plansConfig,
      },
    },
  };
});
