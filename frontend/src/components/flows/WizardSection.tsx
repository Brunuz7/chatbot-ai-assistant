import React from 'react';

type WizardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  active?: boolean;
  step?: number;
  className?: string;
};

export const WizardSection: React.FC<WizardSectionProps> = ({
  title,
  description,
  children,
  active = false,
  step,
  className = '',
}) => (
  <section
    className={[
      'relative overflow-hidden rounded-2xl border transition-all duration-200',
      active
        ? 'border-primary/30 bg-white shadow-md shadow-primary/5 ring-1 ring-primary/15 dark:border-primary/35 dark:bg-slate-900/80 dark:shadow-primary/10'
        : 'border-slate-200/80 bg-white/80 dark:border-slate-800/90 dark:bg-slate-900/40',
      className,
    ].join(' ')}
  >
    {active ? (
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40"
        aria-hidden
      />
    ) : null}
    <div className={`p-4 sm:p-5 ${active ? 'pl-5 sm:pl-6' : ''}`}>
      <header className="mb-3.5 flex items-start gap-3">
        {step != null ? (
          <span
            className={[
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
              active
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            ].join(' ')}
          >
            {step}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="type-section-title">{title}</h3>
          {description ? <p className="type-section-desc mt-1">{description}</p> : null}
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
  accentClass = 'text-primary bg-primary/10',
  variant = 'standalone',
}) => {
  const base =
    variant === 'inline'
      ? 'mt-4 flex gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-700/80'
      : 'flex gap-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-3.5 dark:border-slate-700/80 dark:from-slate-800/40 dark:to-slate-900/40 sm:p-4';

  return (
    <div className={base} role="status">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="type-body text-slate-600 dark:text-slate-300">{description}</p>
        {hint ? <p className="type-muted pt-1">{hint}</p> : null}
      </div>
    </div>
  );
};
