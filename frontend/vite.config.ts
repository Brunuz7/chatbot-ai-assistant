import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import type { AppMeta } from './src/config/mergeAppMeta';
import { mergeAppMetaFromEnv } from './src/config/mergeAppMeta';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, '..');

const APP_BASE_URL_PLACEHOLDER = '__APP_BASE_URL__';

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
      return injectBaseUrl(html, meta.baseUrl);
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
