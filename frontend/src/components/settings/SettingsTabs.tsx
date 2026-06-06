import type { LucideIcon } from 'lucide-react';
import { AudioLines, Clock, FileText, Settings2, User } from 'lucide-react';

const settingsTabs = [
  { id: 'general', label: 'Geral', tabLabel: 'Geral', sidebarLabel: 'Geral', icon: Settings2 },
  { id: 'instructions', label: 'Instruções', tabLabel: 'Instr.', sidebarLabel: 'Instruções', icon: FileText },
  { id: 'audio', label: 'Áudio', tabLabel: 'Áudio', sidebarLabel: 'Áudio', icon: AudioLines },
  { id: 'schedule', label: 'Horário', tabLabel: 'Horário', sidebarLabel: 'Horário', icon: Clock },
  { id: 'account', label: 'Conta', tabLabel: 'Conta', sidebarLabel: 'Conta', icon: User },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  tabLabel: string;
  sidebarLabel: string;
  icon: LucideIcon;
}>;

export type SettingsTabId = (typeof settingsTabs)[number]['id'];

export function isSettingsTabId(raw: string | null): raw is SettingsTabId {
  return settingsTabs.some((tab) => tab.id === raw);
}

export type SettingsTabsProps = {
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
};

export function SettingsTabs({ active, onChange }: SettingsTabsProps) {
  return (
    <>
      {/* Mobile: tab bar — largura igual, sem scroll */}
      <nav className="flex border-b border-border lg:hidden" aria-label="Secções de configurações" role="tablist">
        {settingsTabs.map(({ id, tabLabel, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2.5 transition-colors active:opacity-80 ${
                isActive ? 'text-primary' : 'text-foreground-muted hover:text-foreground'
              }`}>
              <Icon size={18} className="shrink-0" aria-hidden />
              <span className="max-w-full truncate text-[10px] font-medium leading-none sm:text-xs">{tabLabel}</span>
              {isActive ? (
                <span className="absolute inset-x-0.5 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Desktop: sidebar vertical — alinhado ao menu principal */}
      <nav className="hidden lg:block" aria-label="Secções de configurações">
        <ul className="space-y-1">
          {settingsTabs.map(({ id, sidebarLabel, icon: Icon }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-a10 text-primary [&_svg]:stroke-primary [&_svg]:text-primary'
                      : 'text-foreground-muted hover:bg-surface-hover hover:text-primary [&_svg]:stroke-current'
                  }`}>
                  <Icon size={20} className="shrink-0" aria-hidden />
                  {sidebarLabel}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
