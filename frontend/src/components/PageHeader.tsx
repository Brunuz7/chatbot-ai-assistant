import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type PageHeaderProps = {
  /** Ícone da página (Lucide), dimensionado para mobile e desktop. */
  icon: LucideIcon;
  title: string;
  /** Subtítulo curto (uma linha ou duas no máximo em ecrãs pequenos). */
  subtitle: string;
  actions?: ReactNode;
  className?: string;
  /** Classes extra no quadrado do ícone (ex.: cor de fundo). */
  iconClassName?: string;
};

/**
 * Cabeçalho de página padronizado: ícone + título + subtítulo, mobile first.
 * Em `sm+`, ações alinham à direita na mesma faixa; no mobile ficam por baixo em largura total.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className = '',
  iconClassName = '',
}: PageHeaderProps) {
  return (
    <header className={`mb-5 sm:mb-6 md:mb-8 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15 dark:bg-primary/15 dark:ring-primary/25 sm:h-12 sm:w-12 sm:rounded-2xl ${iconClassName}`}
            aria-hidden
          >
            <Icon className="size-[1.05rem] sm:size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5 pt-0.5 sm:space-y-1 sm:pt-1">
            <h1 className="type-page-title">{title}</h1>
            <p className="type-page-subtitle max-w-2xl line-clamp-3 sm:line-clamp-none">
              {subtitle}
            </p>
          </div>
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:self-start sm:pt-0.5 md:pt-1">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
