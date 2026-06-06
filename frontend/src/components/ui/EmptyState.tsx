import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Estado vazio: painel com borda suave, ícone muted e acção outline opcional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className = '',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface px-6 py-16 text-center sm:py-20 ${className}`}
      role="status">
      <Icon size={48} className="mx-auto mb-5 text-foreground-icon" strokeWidth={1.5} aria-hidden />
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" onClick={onAction} className="mt-8">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
