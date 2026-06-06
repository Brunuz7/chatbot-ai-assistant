import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from './Button';

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
  disableBackdropClose?: boolean;
}

export type ModalFormProps = Omit<ModalProps, 'variant' | 'footer'> & {
  formId: string;
  submitLabel: React.ReactNode;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
};

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
  const hasHeaderAddon = headerAddon != null;
  const gutter = CONTENT_GUTTER;

  const handleBackdrop = () => {
    if (!disableBackdropClose) onClose();
  };

  const panelClass = [
    'relative flex w-full flex-col overflow-hidden bg-surface',
    isForm
      ? [
          'h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-1 animate-fade-in',
          'sm:h-auto sm:max-h-[min(92vh,900px)] sm:w-full sm:flex-none',
          'sm:rounded-2xl sm:border sm:border-border-subtle sm:shadow-2xl sm:animate-modal-dialog',
          formPageWidthClass[pageWidth],
        ].join(' ')
      : [
          'rounded-2xl border border-border-subtle shadow-2xl animate-modal-dialog',
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
          'absolute inset-0 bg-overlay-a45 backdrop-blur-sm animate-fade-in',
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
        onClick={(e) => e.stopPropagation()}>
        <header
          className={[
            'shrink-0 border-b border-border-subtle bg-surface-a95 backdrop-blur-md',
            'py-3 sm:py-3.5',
          ].join(' ')}>
          <div className={`flex items-center gap-3 ${gutter}`}>
            {Icon ? (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-a40 bg-primary-a10 text-primary sm:h-11 sm:w-11 [&_svg]:stroke-primary"
                aria-hidden>
                <Icon className="size-[18px] sm:size-5" strokeWidth={2} />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg sm:text-2xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-foreground-muted">{subtitle}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="group shrink-0 rounded-lg border border-border-subtle bg-surface p-2 text-foreground-muted transition-all hover:bg-surface-hover hover:text-foreground"
              aria-label="Fechar">
              <X size={18} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>

          {hasHeaderAddon ? (
            <div className={`mt-3 border-t border-border-subtle pt-3 ${gutter}`}>{headerAddon}</div>
          ) : null}
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
          <main className="custom-scrollbar min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
            <div className={contentWrapClass}>{children}</div>
          </main>

          {hasFooter ? (
            <footer
              className={[
                'shrink-0 border-t border-border-subtle bg-surface-a95 backdrop-blur-md',
                isForm
                  ? 'px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3.5'
                  : 'py-3 sm:py-3.5',
              ].join(' ')}>
              <div className={isForm ? 'w-full' : gutter}>{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Modal de formulário — rodapé fixo com Cancelar + Salvar por padrão. */
export function ModalForm({
  formId,
  submitLabel,
  submitDisabled = false,
  submitLoading = false,
  cancelLabel = 'Cancelar',
  onCancel,
  onClose,
  ...props
}: ModalFormProps) {
  const handleCancel = onCancel ?? onClose;
  const submitButtonDisabled = submitDisabled || submitLoading;

  return (
    <Modal
      variant="form"
      onClose={onClose}
      footer={
        <ModalFormFooter>
          <ModalFormCancelButton type="button" onClick={handleCancel}>
            <X size={18} strokeWidth={2.25} aria-hidden />
            {cancelLabel}
          </ModalFormCancelButton>
          <ModalFormSubmitButton type="submit" form={formId} disabled={submitButtonDisabled}>
            {submitLoading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Check size={18} strokeWidth={2.25} aria-hidden />
            )}
            {submitLabel}
          </ModalFormSubmitButton>
        </ModalFormFooter>
      }
      {...props}
    />
  );
}

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
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{description}</p>
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
    <div
      className={`flex w-full flex-col gap-6 sm:gap-8 [&>form]:flex [&>form]:w-full [&>form]:flex-col [&>form]:gap-6 [&>form]:sm:gap-8 ${className}`}>
      {children}
    </div>
  );
}

function ModalFormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-row items-stretch gap-2 sm:justify-end sm:gap-3 [&>button]:min-w-0 [&>button]:flex-1 sm:[&>button]:flex-none sm:[&>button]:min-w-[9.5rem]">
      {children}
    </div>
  );
}

function ModalFormCancelButton({
  children,
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant="outline" type={type} className={`gap-2 ${className}`.trim()} {...props}>
      {children}
    </Button>
  );
}

function ModalFormSubmitButton({
  children,
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-foreground-inverse transition-all hover:border-primary-hover hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-a40 focus:ring-offset-0 enabled:!opacity-100 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}>
      {children}
    </button>
  );
}

/** @deprecated Use `ModalFormSubmitButton` no `footer` do modal. Mantido para `FloatingDock` em Configurações. */
export function ModalFloatingButton({
  children,
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-a20 transition-all hover:border-primary-hover hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-a40 focus:ring-offset-0 enabled:!opacity-100 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}>
      {children}
    </button>
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
      ].join(' ')}>
      {children}
    </div>
  );
}
