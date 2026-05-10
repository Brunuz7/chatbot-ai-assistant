import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Rendered inside the header below title/subtitle (e.g. wizard stepper) */
  headerAddon?: React.ReactNode;
  /** Fixed footer; middle area scrolls independently */
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children,
  maxWidth = 'md',
  headerAddon,
  footer,
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses: Record<NonNullable<ModalProps['maxWidth']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-none',
  };

  const isFull = maxWidth === 'full';
  const splitScroll = footer != null;

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden ${isFull ? 'flex flex-col' : 'flex items-center justify-center p-4'}`}>
      {/* Backdrop with premium blur */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[8px] transition-opacity duration-300 ease-in-out animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`bg-white dark:bg-slate-900 w-full ${maxWidthClasses[maxWidth]} ${isFull ? 'h-full min-h-0 flex-1 rounded-none border-0 m-0' : 'rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800'} shadow-2xl overflow-hidden relative z-[110] flex flex-col animate-scale-in transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex flex-col gap-0 border-b border-slate-100 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0 ${
            headerAddon != null
              ? isFull
                ? 'px-4 py-3 sm:px-6 sm:py-3.5 md:px-8'
                : 'p-4 sm:p-6'
              : isFull
                ? 'px-4 py-4 sm:px-8 sm:py-5'
                : 'p-6 pb-4'
          }`}
        >
          <div className="flex items-start justify-between gap-3 w-full">
            <div className={`min-w-0 ${headerAddon != null ? 'space-y-0.5' : 'space-y-1'}`}>
              <h3
                className={`font-bold tracking-tight text-slate-900 dark:text-white ${headerAddon != null ? 'text-lg leading-snug' : 'text-xl'}`}
              >
                {title}
              </h3>
              {subtitle ? (
                <p
                  className={`text-slate-500 dark:text-slate-400 leading-snug ${headerAddon != null ? 'text-xs line-clamp-1' : 'text-sm'}`}
                >
                  {subtitle}
                </p>
              ) : null}
              {headerAddon == null ? <div className="h-1 w-12 bg-primary rounded-full" /> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 group shrink-0 ${
                headerAddon != null ? 'p-2 -mt-0.5 -mr-1' : 'p-2.5'
              }`}
            >
              <X size={headerAddon != null ? 20 : 22} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          {headerAddon != null ? (
            <div className="mx-auto mt-3 w-full max-w-5xl border-t border-slate-100 pt-3 dark:border-slate-800">
              {headerAddon}
            </div>
          ) : null}
        </div>

        {/* Body: single scroll OR scroll + fixed footer */}
        {splitScroll ? (
          <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${!isFull ? 'max-h-[min(85vh,920px)]' : ''}`}>
            <div
              className={`scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 flex min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6`}
            >
              {children}
            </div>
            {footer != null ? (
              <div className="z-10 shrink-0 border-t border-slate-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none sm:px-6 sm:py-4 md:px-8">
                {footer}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={`scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 overflow-y-auto ${isFull ? 'flex-1 min-h-0 px-8 py-6' : 'p-8 pt-6 max-h-[80vh]'}`}
            >
              {children}
            </div>
            {!isFull ? <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" /> : null}
          </>
        )}
      </div>
    </div>
  );
};

