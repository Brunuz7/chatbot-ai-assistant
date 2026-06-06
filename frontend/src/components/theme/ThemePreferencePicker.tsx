import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemePreference } from '../../contexts/ThemeContext';

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Escuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

/** Segmented control estilo GitHub / Vercel appearance settings. */
export function ThemePreferencePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="flex w-full rounded-lg border border-border bg-surface-inset p-1"
      role="radiogroup"
      aria-label="Tema do painel">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = preference === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
                : 'text-foreground-muted hover:text-foreground'
            }`}>
            <Icon size={16} className="shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
