import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

const FLOATING_ACTION_CLASSES =
  'pointer-events-auto fixed z-40 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[calc((100vw+var(--layout-sidebar-width,0px))/2)] -translate-x-1/2 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/5 dark:shadow-black/40 dark:ring-white/10';

export type FloatingDockProps = {
  visible: boolean;
  /** Um único elemento (ex.: `<Button>`). Recebe classes de posicionamento fixo centradas na área útil (com menu lateral em `lg+`). */
  children: ReactNode;
};

/**
 * Apenas posicionamento: sem faixa, blur ou borda. O filho é o único nó visível (botão flutuante centrado).
 */
export function FloatingDock({ visible, children }: FloatingDockProps) {
  if (!visible) return null;

  const only = Children.only(children);
  if (!isValidElement(only)) {
    throw new Error('FloatingDock: use um único elemento filho (ex.: um Button).');
  }

  const el = only as ReactElement<{ className?: string }>;
  const merged = [el.props.className, FLOATING_ACTION_CLASSES].filter(Boolean).join(' ');

  return cloneElement(el, { className: merged });
}
