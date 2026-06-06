import type { ElementType, ReactNode } from 'react';

export type LabelProps<T extends ElementType = 'label'> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** Rótulo de formulário. */
export function Label<T extends ElementType = 'label'>({
  as,
  className = '',
  children,
  ...props
}: LabelProps<T>) {
  const Component = (as ?? 'label') as ElementType;
  const merged = [
    'text-sm font-medium leading-snug text-foreground-muted',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={merged} {...props}>
      {children}
    </Component>
  );
}
