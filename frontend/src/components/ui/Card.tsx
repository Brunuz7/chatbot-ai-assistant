import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-6 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`flex justify-between items-center mb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold text-foreground sm:text-base">{children}</h3>
);

export type CardMenuAction = {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  variant?: 'default' | 'danger';
};

type CardActionsMenuProps = {
  actions: CardMenuAction[];
  disabled?: boolean;
  ariaLabel?: string;
  align?: 'left' | 'right';
};

export function CardActionsMenu({
  actions,
  disabled = false,
  ariaLabel = 'Abrir menu de acções',
  align = 'right',
}: CardActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const visible = actions.filter((a) => !a.hidden);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    const syncMenuPosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = 176;
      setMenuPosition({
        top: rect.bottom + 4,
        left: align === 'right' ? rect.right - menuWidth : rect.left,
      });
    };

    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);
    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-foreground-icon transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50">
        <MoreVertical size={18} aria-hidden />
      </button>
      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              className="fixed z-50 min-w-[11rem] overflow-hidden rounded-xl border border-border-subtle bg-surface py-1 shadow-lg shadow-overlay-a15">
              {visible.map((action) => (
                <button
                  key={action.id ?? action.label}
                  type="button"
                  role="menuitem"
                  disabled={disabled || action.disabled}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
                    action.variant === 'danger'
                      ? 'text-danger hover:bg-danger-muted'
                      : 'text-foreground hover:bg-surface-hover'
                  }`}>
                  {action.icon ? <span className="shrink-0 opacity-80">{action.icon}</span> : null}
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export type CardFieldProps = {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

/** Linha do card no formato «Ícone  Chave: Valor». */
export function CardField({ label, value, icon, className = '' }: CardFieldProps) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className={`flex items-start gap-2 text-sm ${className}`}>
      {icon ? (
        <span className="mt-0.5 shrink-0 text-foreground-icon [&_svg]:size-3.5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 leading-snug">
        <span className="font-medium text-foreground-muted">{label}: </span>
        {isEmpty ? (
          <span className="text-foreground">—</span>
        ) : (
          <span className="text-foreground">{value}</span>
        )}
      </div>
    </div>
  );
}

export type DataCardProps = {
  /** Informação principal — única linha no header do card. */
  title: React.ReactNode;
  /** Detalhes secundários (telefone, tags, estado, etc.). */
  children?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: CardMenuAction[];
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  menuAriaLabel?: string;
};

export function DataCard({
  title,
  children,
  footer,
  actions = [],
  onClick,
  className = '',
  disabled = false,
  menuAriaLabel,
}: DataCardProps) {
  const clickable = Boolean(onClick) && !disabled;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 ${
        clickable
          ? 'cursor-pointer hover:border-primary-a25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a20'
          : ''
      } ${className}`}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</h3>
        <CardActionsMenu actions={actions} disabled={disabled} ariaLabel={menuAriaLabel ?? 'Acções do item'} />
      </header>

      {children ? <div className="flex flex-1 flex-col gap-2.5 px-4 py-3">{children}</div> : null}

      {footer ? (
        <footer className="mt-auto border-t border-border px-5 py-3.5">{footer}</footer>
      ) : null}
    </article>
  );
}
