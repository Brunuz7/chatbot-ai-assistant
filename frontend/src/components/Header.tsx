import React from 'react';
import { Bell, Menu, HelpCircle, ChevronLeft, ChevronRight, User, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuthProfile } from '../contexts/AuthProfileContext';
import { useTheme } from '../contexts/ThemeContext';
interface HeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isCollapsed, onCollapseToggle }) => {
  const { profile } = useAuthProfile();
  const { toggleResolved } = useTheme();

  const displayName = profile?.name?.trim() || profile?.email || 'Usuário';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border-subtle bg-surface-a95 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="p-2 text-foreground-icon hover:text-primary lg:hidden">
          <Menu size={22} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseToggle}
          className="hidden rounded-lg p-2 text-foreground-icon hover:bg-surface-hover hover:text-primary lg:flex"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="mr-1 flex items-center gap-0.5 border-r border-border pr-2 md:mr-2 md:gap-1 md:pr-4">
          <button
            type="button"
            onClick={toggleResolved}
            className="rounded-lg p-2 text-foreground-icon transition-colors hover:bg-surface-hover hover:text-foreground"
            title="Alternar tema claro/escuro"
            aria-label="Alternar tema claro/escuro">
            <Sun size={20} className="hidden dark:block" />
            <Moon size={20} className="dark:hidden" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-foreground-icon transition-colors hover:bg-surface-hover hover:text-foreground">
            <Bell size={20} />
          </button>
          <button
            type="button"
            className="hidden rounded-lg p-2 text-foreground-icon transition-colors hover:bg-surface-hover hover:text-foreground sm:block">
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="group flex cursor-pointer items-center gap-3 pl-1">
          <div className="hidden flex-col items-end md:flex">
            <span className="text-sm font-bold leading-none text-foreground transition-colors group-hover:text-primary">
              {displayName}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              Administrador
            </span>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-foreground-inverse transition-transform group-hover:scale-105"
            aria-hidden>
            <User size={20} strokeWidth={2} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
