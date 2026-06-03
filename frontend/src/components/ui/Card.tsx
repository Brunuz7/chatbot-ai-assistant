import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`flex justify-between items-center mb-4 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">{children}</h3>
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
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreVertical size={18} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
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
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {action.icon ? <span className="shrink-0 opacity-80">{action.icon}</span> : null}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
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
        <span className="mt-0.5 shrink-0 text-slate-400 [&_svg]:size-3.5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 leading-snug">
        <span className="font-medium text-slate-600 dark:text-slate-400">{label}: </span>
        {isEmpty ? (
          <span className="text-slate-800 dark:text-slate-200">—</span>
        ) : (
          <span className="text-slate-800 dark:text-slate-200">{value}</span>
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
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        clickable
          ? 'cursor-pointer hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
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
      tabIndex={clickable ? 0 : undefined}
    >
      <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        <CardActionsMenu
          actions={actions}
          disabled={disabled}
          ariaLabel={menuAriaLabel ?? 'Acções do item'}
        />
      </header>

      {children ? <div className="flex flex-1 flex-col gap-2.5 px-4 py-3">{children}</div> : null}

      {footer ? (
        <footer className="mt-auto border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">{footer}</footer>
      ) : null}
    </article>
  );
}
