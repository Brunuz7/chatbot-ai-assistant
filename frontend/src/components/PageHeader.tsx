import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type PageHeaderProps = {
  /** Ícone da página (Lucide). Omitir para título sem ícone. */
  icon?: LucideIcon;
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
        <div className={`flex min-w-0 ${Icon ? 'gap-3 sm:gap-4' : ''}`}>
          {Icon ? (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-a40 bg-primary-a10 text-primary sm:h-11 sm:w-11 [&_svg]:stroke-primary ${iconClassName}`}
              aria-hidden>
              <Icon className="size-5" strokeWidth={2} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-0.5 pt-0.5 sm:space-y-1 sm:pt-1">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="max-w-2xl line-clamp-2 text-sm leading-relaxed text-foreground-muted">
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
