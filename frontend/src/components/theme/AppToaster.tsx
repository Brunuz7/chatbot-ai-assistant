import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

function useDocumentDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function AppToaster() {
  const isDark = useDocumentDark();

  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-surface border-border-subtle text-foreground',
          description: 'text-foreground-muted',
        },
      }}
    />
  );
}
