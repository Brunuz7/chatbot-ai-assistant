import logo from '../../assets/logo.svg';
import logoLight from '../../assets/logo-light.svg';
import { useTheme } from '../../contexts/ThemeContext';

/** Splash de arranque — marca Prestei com anel de carregamento (só carga inicial). */
export function InitialSplash() {
  const { resolved } = useTheme();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy
      aria-label="A carregar aplicação">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-primary-a15 border-t-primary animate-spin"
          aria-hidden
        />
        <img
          src={resolved === 'dark' ? logo : logoLight}
          alt="Assistente Prestei"
          className="relative h-8 w-auto max-w-[9rem] drop-shadow-sm"
          width={160}
          height={35}
        />
      </div>
    </div>
  );
}
