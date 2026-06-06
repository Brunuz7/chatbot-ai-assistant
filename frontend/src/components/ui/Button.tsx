import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-a40 focus:ring-offset-0 focus-visible:ring-primary-a40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'border border-primary bg-primary text-white hover:bg-primary-hover',
    outline:
      'border border-primary bg-transparent text-primary hover:bg-primary-a10',
    danger: 'bg-danger text-white hover:opacity-90 focus:ring-danger-a40',
    ghost: 'bg-transparent text-foreground-muted hover:bg-primary-a10 hover:text-primary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-3',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};
