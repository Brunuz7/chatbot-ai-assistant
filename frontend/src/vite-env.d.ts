/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_SHORT_TITLE?: string;
  readonly VITE_APP_DESCRIPTION?: string;
  readonly VITE_APP_KEYWORDS?: string;
  readonly VITE_APP_AUTHOR?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_FAVICON?: string;
  readonly VITE_APP_OG_IMAGE?: string;
  readonly VITE_APP_APPLE_TOUCH_ICON?: string;
  readonly VITE_APP_THEME_COLOR?: string;
  readonly VITE_APP_LOCALE?: string;
  readonly VITE_APP_SITE_NAME?: string;
  readonly VITE_APP_TWITTER_CARD?: string;
  readonly VITE_APP_ROBOTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
