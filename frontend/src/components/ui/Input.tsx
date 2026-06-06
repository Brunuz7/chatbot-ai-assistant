import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Label } from './Label';
import { digitsOnlyPhone, formatPhoneMask, parsePhoneInput, DEFAULT_PHONE_COUNTRY_CODE, DEFAULT_PHONE_INPUT_VALUE } from '../../utils/phoneMask';
import { formatCurrencyMask, parseCurrencyInput } from '../../utils/currencyMask';

const fieldControlClass =
  'w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm leading-normal text-foreground transition-colors duration-150 placeholder:text-foreground-icon focus:border-primary-a40 focus:outline-none focus:ring-2 focus:ring-primary-a15';

export function fieldControlClassName(className = '', error?: string) {
  return [fieldControlClass, error ? '!border-danger' : '', className].filter(Boolean).join(' ');
}

type FieldShellProps = {
  label?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

function FieldShell({ label, error, htmlFor, className = '', children }: FieldShellProps) {
  return (
    <div className={`w-full space-y-1.5 ${className}`.trim()}>
      {label ? (
        <Label htmlFor={htmlFor} className="block">
          {label}
        </Label>
      ) : null}
      {children}
      {error?.trim() ? <p className="text-sm font-medium leading-normal text-danger">{error}</p> : null}
    </div>
  );
}

export type FieldControlProps<T extends 'input' | 'textarea' | 'select' = 'input'> = {
  as?: T;
  error?: string;
  className?: string;
} & (T extends 'textarea'
  ? React.TextareaHTMLAttributes<HTMLTextAreaElement>
  : T extends 'select'
    ? React.SelectHTMLAttributes<HTMLSelectElement> & { children?: ReactNode }
    : React.InputHTMLAttributes<HTMLInputElement>);

/** Apenas o controlo (input, textarea ou select). */
export function FieldControl<T extends 'input' | 'textarea' | 'select' = 'input'>({
  as,
  error,
  className = '',
  children,
  ...props
}: FieldControlProps<T>) {
  const cls = fieldControlClassName(className, error);
  const controlAs = as ?? 'input';

  if (controlAs === 'textarea') {
    const { ...textareaProps } = props as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
    return <textarea className={cls} {...textareaProps} />;
  }

  if (controlAs === 'select') {
    const selectProps = props as React.SelectHTMLAttributes<HTMLSelectElement>;
    return (
      <select className={cls} {...selectProps}>
        {children}
      </select>
    );
  }

  const inputProps = props as React.InputHTMLAttributes<HTMLInputElement>;
  return <input className={cls} {...inputProps} />;
}

export type FieldProps<T extends 'input' | 'textarea' | 'select' = 'input'> = FieldControlProps<T> & {
  label?: string;
  wrapperClassName?: string;
};

/** Campo de formulário completo: rótulo + controlo + erro. */
export function Field<T extends 'input' | 'textarea' | 'select' = 'input'>({
  as,
  label,
  error,
  wrapperClassName,
  id,
  className,
  children,
  ...props
}: FieldProps<T>) {
  const controlId =
    id ??
    (label && typeof label === 'string' ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const controlAs = (as ?? 'input') as T;

  return (
    <FieldShell label={label} error={error} htmlFor={controlId} className={wrapperClassName}>
      <FieldControl as={controlAs} id={controlId} error={error} className={className} {...(props as FieldControlProps<T>)}>
        {children}
      </FieldControl>
    </FieldShell>
  );
}

export type InputProps = Omit<FieldProps<'input'>, 'as'>;

export const Input: React.FC<InputProps> = (props) => <Field as="input" {...props} />;

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
};

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? (label ? `password-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <FieldShell label={label} error={error} htmlFor={inputId}>
      <div className="relative">
        <FieldControl
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete={props.autoComplete ?? 'current-password'}
          error={error}
          className={`pr-11 ${className}`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground-icon transition-colors hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Exibir senha'}
          aria-pressed={visible}>
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </FieldShell>
  );
};

export type TextAreaProps = Omit<FieldProps<'textarea'>, 'as'>;

export const TextArea: React.FC<TextAreaProps> = (props) => <Field as="textarea" {...props} />;

export type SelectProps = Omit<FieldProps<'select'>, 'as'>;

export const Select: React.FC<SelectProps> = ({ children, ...props }) => (
  <Field as="select" {...props}>
    {children}
  </Field>
);

export const PhoneInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    label?: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
  }
> = ({ label, error, value, onChange, className = '', ...props }) => {
  const display = formatPhoneMask(value);

  return (
    <Field
      label={label}
      error={error}
      type="tel"
      inputMode="numeric"
      value={display}
      className={className}
      onChange={(e) => onChange(parsePhoneInput(e.target.value))}
      {...props}
    />
  );
};

export function phoneDigitsFromInput(value: string): string {
  return digitsOnlyPhone(value);
}

export const CurrencyInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
    label?: string;
    error?: string;
    value: string;
    onChange: (digits: string) => void;
  }
> = ({ label, error, value, onChange, className = '', ...props }) => (
  <Field
    label={label}
    error={error}
    type="text"
    inputMode="decimal"
    value={formatCurrencyMask(value)}
    className={className}
    onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
    {...props}
  />
);

export { DEFAULT_PHONE_COUNTRY_CODE, DEFAULT_PHONE_INPUT_VALUE };
