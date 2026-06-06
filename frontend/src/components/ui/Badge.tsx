import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const variants = {
    success: 'bg-success-muted text-success-text',
    warning: 'bg-warning-muted text-warning-text',
    danger: 'bg-danger-muted text-danger-text',
    info: 'bg-info-muted text-info-text',
    default: 'bg-neutral-muted text-neutral-text',
    outline: 'bg-primary-a10 font-semibold text-primary',
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
