import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = 'md'
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop with premium blur */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[8px] transition-opacity duration-300 ease-in-out animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`bg-white dark:bg-slate-900 w-full ${maxWidthClasses[maxWidth]} rounded-[2rem] shadow-2xl shadow-indigo-500/10 overflow-hidden relative z-[110] border border-white/20 dark:border-slate-800/50 flex flex-col animate-scale-in transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-200 group"
          >
            <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 pt-6 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {children}
        </div>

        {/* Optional Footer Decoration */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
      </div>
    </div>
  );
};

