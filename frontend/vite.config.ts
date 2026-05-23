import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import type { AppMeta } from './src/config/mergeAppMeta';
import { mergeAppMetaFromEnv } from './src/config/mergeAppMeta';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, '..');

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHeadInject(meta: AppMeta): string {
  const e = escapeHtmlAttr;
  const faviconHref = meta.favicon.startsWith('http')
    ? meta.favicon
    : meta.favicon;
  const appleHref = meta.appleTouchIcon.startsWith('http')
    ? meta.appleTouchIcon
    : meta.appleTouchIcon;

  return `
    <title>${e(meta.title)}</title>
    <meta name="application-name" content="${e(meta.siteName)}" />
    <meta name="description" content="${e(meta.description)}" />
    <meta name="keywords" content="${e(meta.keywords)}" />
    <meta name="author" content="${e(meta.author)}" />
    <meta name="robots" content="${e(meta.robots)}" />
    <meta name="googlebot" content="${e(meta.robots)}" />
    <meta name="theme-color" content="${e(meta.themeColor)}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="format-detection" content="telephone=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${e(meta.baseUrl)}" />
    <meta property="og:title" content="${e(meta.title)}" />
    <meta property="og:description" content="${e(meta.description)}" />
    <meta property="og:image" content="${e(meta.ogImage)}" />
    <meta property="og:image:type" content="${e(meta.ogImageMime)}" />
    <meta property="og:image:alt" content="${e(meta.title)}" />
    <meta property="og:locale" content="${e(meta.locale)}" />
    <meta property="og:site_name" content="${e(meta.siteName)}" />

    <meta name="twitter:card" content="${e(meta.twitterCard)}" />
    <meta name="twitter:url" content="${e(meta.baseUrl)}" />
    <meta name="twitter:title" content="${e(meta.title)}" />
    <meta name="twitter:description" content="${e(meta.description)}" />
    <meta name="twitter:image" content="${e(meta.ogImage)}" />

    <meta name="msapplication-TileColor" content="${e(meta.themeColor)}" />

    <link rel="canonical" href="${e(meta.baseUrl)}" />
    <link rel="icon" type="image/svg+xml" href="${e(faviconHref)}" />
    <link rel="apple-touch-icon" href="${e(appleHref)}" />
    <link rel="manifest" href="/site.webmanifest" />
  `
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n    ');
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

function appMetaPlugin(meta: AppMeta): import('vite').Plugin {
  return {
    name: 'app-meta-html',
    transformIndexHtml(html) {
      let out = html.replace(/<!--app-head-inject-->/, buildHeadInject(meta));
      out = out.replace(
        /<html lang="[^"]*">/,
        `<html lang="${escapeHtmlAttr(htmlLang(meta))}">`,
      );
      return out;
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

function htmlLang(meta: AppMeta): string {
  return meta.locale.replace(/_/g, '-');
}

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, envDir, '');
  const meta = mergeAppMetaFromEnv(loaded);

  let apiProxyTarget =
    (loaded.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '').replace(/(\/api)+$/, '');
  try {
    const u = new URL(apiProxyTarget.includes('://') ? apiProxyTarget : `http://${apiProxyTarget}`);
    apiProxyTarget = u.origin;
  } catch {
    apiProxyTarget = 'http://127.0.0.1:3001';
  }

  return {
    envDir,
    plugins: [react(), appMetaPlugin(meta)],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
