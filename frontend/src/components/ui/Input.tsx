import React from 'react';
import { digitsOnlyPhone, formatPhoneMask } from '../../utils/phoneMask';

const labelClass = 'type-label block';
const controlClass =
  'type-control w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 transition-all placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const hintClass = 'type-muted font-medium text-red-500';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full space-y-2">
      {label ? <label className={labelClass}>{label}</label> : null}
      <input
        className={`${controlClass} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error ? <p className={hintClass}>{error}</p> : null}
    </div>
  );
};

export const TextArea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full space-y-2">
      {label ? <label className={labelClass}>{label}</label> : null}
      <textarea
        className={`${controlClass} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error ? <p className={hintClass}>{error}</p> : null}
    </div>
  );
};

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  label?: string;
  error?: string;
  value: string;
  onChange: (digits: string) => void;
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  error,
  className = '',
  value,
  onChange,
  placeholder = '+55 (11) 99999-9999',
  ...props
}) => {
  return (
    <Input
      label={label}
      error={error}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder={placeholder}
      className={className}
      value={formatPhoneMask(value)}
      onChange={(e) => onChange(digitsOnlyPhone(e.target.value))}
      {...props}
    />
  );
};

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
> = ({ label, error, className = '', children, ...props }) => {
  return (
    <div className="w-full space-y-2">
      {label ? <label className={labelClass}>{label}</label> : null}
      <div className="relative">
        <select
          className={`${controlClass} appearance-none pr-10 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
      {error ? <p className={hintClass}>{error}</p> : null}
    </div>
  );
};
