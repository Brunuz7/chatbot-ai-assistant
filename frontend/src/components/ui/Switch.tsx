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
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-a40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      checked ? 'bg-primary' : 'bg-switch-off',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    ].join(' ')}>
    <span
      className={[
        'inline-block h-4 w-4 transform rounded-full bg-foreground-inverse shadow-sm transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1',
      ].join(' ')}
      aria-hidden
    />
  </button>
);
