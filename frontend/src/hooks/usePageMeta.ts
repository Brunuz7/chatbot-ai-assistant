import { useEffect } from 'react';

type PageMetaOptions = {
  title: string;
  description?: string;
  canonicalUrl?: string;
};

function setMetaTag(
  selector: string,
  createAttrs: Record<string, string>,
  content: string,
) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(createAttrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Atualiza título e meta tags no cliente (páginas legais públicas). */
export function usePageMeta({ title, description, canonicalUrl }: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const prevDescription =
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') ??
      '';

    if (description) {
      setMetaTag('meta[name="description"]', { name: 'description' }, description);
    }

    const prevCanonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? '';

    if (canonicalUrl) {
      setCanonicalLink(canonicalUrl);
    }

    return () => {
      document.title = prevTitle;
      if (description) {
        setMetaTag('meta[name="description"]', { name: 'description' }, prevDescription);
      }
      if (canonicalUrl) {
        if (prevCanonical) setCanonicalLink(prevCanonical);
      }
    };
  }, [title, description, canonicalUrl]);
}
