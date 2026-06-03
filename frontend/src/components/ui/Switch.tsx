import React from 'react';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className = '',
}) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={[
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
      checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    ].join(' ')}
  >
    <span
      className={[
        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1',
      ].join(' ')}
      aria-hidden
    />
  </button>
);
