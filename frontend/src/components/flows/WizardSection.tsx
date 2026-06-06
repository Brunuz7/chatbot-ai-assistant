import React from 'react';
import type { LucideIcon } from 'lucide-react';

type WizardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export const WizardSection: React.FC<WizardSectionProps> = ({
  title,
  description,
  children,
  icon: Icon,
  className = '',
}) => (
  <section
    className={[
      'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 transition-all duration-200 dark:border-slate-800/90 dark:bg-slate-900/40',
      className,
    ].join(' ')}>
    <div className="p-4 sm:p-5">
      <header className="mb-3.5 flex items-start gap-3">
        {Icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-a10 text-primary ring-1 ring-primary-a15 dark:bg-primary-a15 dark:ring-primary-a25"
            aria-hidden>
            <Icon className="size-4" strokeWidth={2} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-base">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  </section>
);

type ActionHintCardProps = {
  title: string;
  description: string;
  hint?: string;
  icon: React.ReactNode;
  accentClass?: string;
  variant?: 'standalone' | 'inline';
};

export const ActionHintCard: React.FC<ActionHintCardProps> = ({
  title,
  description,
  hint,
  icon,
  accentClass = 'text-primary bg-primary-a10',
  variant = 'standalone',
}) => {
  const base =
    variant === 'inline'
      ? 'mt-4 flex gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-700/80'
      : 'flex gap-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-3.5 dark:border-slate-700/80 dark:from-slate-800/40 dark:to-slate-900/40 sm:p-4';

  return (
    <div className={base} role="status">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>{icon}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-base leading-normal text-slate-600 dark:text-slate-300">{description}</p>
        {hint ? <p className="pt-1 text-sm leading-normal text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
};
