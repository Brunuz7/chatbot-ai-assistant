import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { FLOATING_ACTION_END_SPACER } from '../../lib/floatingActionLayout';

/** Acima de sidebar (z-50), header (z-30) e dropdowns; portal em document.body evita stacking context do layout. */
const MODAL_Z = 'z-[10000]';

export type ModalVariant = 'page' | 'dialog' | 'form';
/** @deprecated Use `form` — mantido só para compatibilidade. */
export type ModalVariantLegacy = ModalVariant | 'fullscreen';
export type ModalPageWidth = 'md' | 'lg' | 'xl' | 'wide';
export type ModalBodySize = 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** `form` = ecrã inteiro no mobile, painel centrado no desktop. `page` = painel centrado. `dialog` = confirmações compactas. */
  variant?: ModalVariant | 'fullscreen';
  pageWidth?: ModalPageWidth;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  headerAddon?: React.ReactNode;
  footer?: React.ReactNode;
  /** Ação flutuante no fundo (ex.: Salvar). Substitui o rodapé em formulários. */
  floatingAction?: React.ReactNode;
  disableBackdropClose?: boolean;
}

const formPageWidthClass: Record<ModalPageWidth, string> = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-2xl',
  wide: 'sm:max-w-3xl lg:sm:max-w-4xl',
};

const pageWidthClass: Record<ModalPageWidth, string> = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  wide: 'max-w-3xl lg:max-w-4xl',
};

const dialogMaxWidth: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

const CONTENT_GUTTER = 'px-4 sm:px-6';

function resolveVariant(variant: ModalProps['variant']): ModalVariant {
  if (variant === 'fullscreen') return 'form';
  return variant ?? 'page';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  variant: variantProp = 'page',
  pageWidth = 'xl',
  maxWidth,
  headerAddon,
  footer,
  floatingAction,
  disableBackdropClose = false,
}) => {
  const variant = resolveVariant(variantProp);
  const isForm = variant === 'form';
  const isPage = variant === 'page';

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasFooter = footer != null;
  const hasFloatingAction = floatingAction != null;
  const hasHeaderAddon = headerAddon != null;
  const gutter = CONTENT_GUTTER;

  const handleBackdrop = () => {
    if (!disableBackdropClose) onClose();
  };

  const panelClass = [
    'relative flex w-full flex-col overflow-hidden bg-white dark:bg-slate-900',
    isForm
      ? [
          'h-[100dvh] max-h-[100dvh] min-h-0 flex-1 animate-fade-in',
          'sm:h-auto sm:max-h-[min(92vh,900px)] sm:flex-none',
          'sm:rounded-2xl sm:border sm:border-slate-200/90 sm:shadow-2xl sm:animate-modal-dialog dark:sm:border-slate-800',
          formPageWidthClass[pageWidth],
        ].join(' ')
      : [
          'rounded-2xl border border-slate-200/90 shadow-2xl animate-modal-dialog dark:border-slate-800',
          isPage
            ? `max-h-[min(92vh,900px)] ${pageWidthClass[pageWidth]}`
            : `max-h-[min(88vh,720px)] ${dialogMaxWidth[maxWidth ?? 'lg']}`,
        ].join(' '),
  ].join(' ');

  const shellClass = isForm
    ? `fixed inset-0 ${MODAL_Z} flex h-[100dvh] max-h-[100dvh] flex-col isolate sm:items-center sm:justify-center sm:p-4 md:p-6`
    : `fixed inset-0 ${MODAL_Z} flex items-center justify-center p-4 sm:p-6 isolate`;

  const contentWrapClass = `w-full py-4 sm:py-5 ${gutter}`;

  return createPortal(
    <div className={shellClass}>
      <div
        className={[
          'absolute inset-0 bg-slate-900/45 backdrop-blur-sm animate-fade-in dark:bg-slate-950/75',
          isForm ? 'hidden sm:block' : '',
        ].join(' ')}
        onClick={handleBackdrop}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={panelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={[
            'shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95',
            'py-3 sm:py-3.5',
          ].join(' ')}
        >
          <div className={`flex items-center gap-3 ${gutter}`}>
            {Icon ? (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-primary/15 dark:ring-primary/25 sm:rounded-2xl"
                aria-hidden
              >
                <Icon className="size-[18px] sm:size-5" strokeWidth={2} />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <h2
                id="modal-title"
                className="type-page-title text-base sm:text-lg"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="type-page-subtitle mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 group dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Fechar"
            >
              <X size={18} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>

          {hasHeaderAddon ? (
            <div className={`mt-3 border-t border-slate-100 pt-3 dark:border-slate-800 ${gutter}`}>
              {headerAddon}
            </div>
          ) : null}
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900">
          <main className="custom-scrollbar min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
            <div className={contentWrapClass}>{children}</div>
            {hasFloatingAction ? (
              <div className={`w-full ${FLOATING_ACTION_END_SPACER}`} aria-hidden />
            ) : null}
          </main>

          {hasFloatingAction ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-4 pb-1 sm:bottom-4">
              {floatingAction}
            </div>
          ) : null}

          {hasFooter ? (
            <footer
              className={[
                'shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95',
                'py-3 sm:py-3.5',
              ].join(' ')}
            >
              <div className={gutter}>{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Agrupa campos do formulário em largura total. */
export function ModalSection({
  title,
  description,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`w-full ${className}`}>
      {title ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex w-full flex-col gap-4">{children}</div>
    </section>
  );
}

/** Conteúdo com espaçamento vertical entre secções. */
export function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  size?: ModalBodySize;
  className?: string;
}) {
  return (
    <div className={`flex w-full flex-col gap-6 sm:gap-8 ${className}`}>{children}</div>
  );
}

/** Botão flutuante centrado (estilo do editor de fluxos). */
export function ModalFloatingButton({
  children,
  className = '',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      size="md"
      className={[
        'pointer-events-auto min-w-[9.5rem] gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-white shadow-lg shadow-primary/20',
        'enabled:!opacity-100 disabled:opacity-50 hover:bg-primary-hover',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Button>
  );
}

/** Botões no rodapé — para diálogos de confirmação. */
export function ModalFooterBar({
  children,
  align = 'end',
}: {
  children: React.ReactNode;
  align?: 'end' | 'between';
  size?: ModalBodySize;
}) {
  return (
    <div
      className={[
        'flex w-full flex-row items-stretch gap-2 sm:gap-3',
        '[&_button]:min-w-0 [&_button]:flex-1',
        'sm:[&_button]:flex-none sm:[&_button]:shrink-0',
        align === 'between' ? 'sm:items-center sm:justify-between' : 'sm:justify-end',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
