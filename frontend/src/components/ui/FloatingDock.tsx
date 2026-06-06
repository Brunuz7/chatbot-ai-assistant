import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FLOATING_DOCK_BOTTOM = 'bottom-[max(8px,env(safe-area-inset-bottom))]';
const VIEWPORT_DOCK_CLASS = `pointer-events-none fixed z-40 ${FLOATING_DOCK_BOTTOM} left-[calc((100vw+var(--layout-sidebar-width,0px))/2)] flex -translate-x-1/2 justify-center`;
const SETTINGS_DOCK_CLASS = `pointer-events-none fixed z-40 ${FLOATING_DOCK_BOTTOM} left-[var(--layout-sidebar-width,0px)] right-0`;

export type FloatingDockProps = {
  visible: boolean;
  align?: 'viewport' | 'settings-content';
  children: ReactNode;
};

export function FloatingDock({ visible, children, align = 'viewport' }: FloatingDockProps) {
  if (!visible || typeof document === 'undefined') return null;

  const dock =
    align === 'settings-content' ? (
      <div className={SETTINGS_DOCK_CLASS}>
        <div className="mx-auto flex w-full max-w-7xl justify-center px-6 md:px-8">
          <div className="flex w-full flex-col gap-4 lg:max-w-none lg:flex-row lg:gap-8 xl:gap-10">
            <div className="hidden shrink-0 lg:block lg:w-44 xl:w-48" aria-hidden />
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="pointer-events-auto">{children}</div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className={VIEWPORT_DOCK_CLASS}>
        <div className="pointer-events-auto">{children}</div>
      </div>
    );

  return createPortal(dock, document.body);
}
