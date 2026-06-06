import React from 'react';
import { Check } from 'lucide-react';
import { ENTRY_MODE_OPTIONS } from './flowWizardConstants';

type EntryModePickerProps = {
  value: string;
  onChange: (mode: string) => void;
};

export const EntryModePicker: React.FC<EntryModePickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Quando este fluxo inicia">
    {ENTRY_MODE_OPTIONS.map((mode) => {
      const selected = value === mode.id;
      const Icon = mode.icon;

      return (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={[
            'group relative flex gap-3 rounded-xl border p-3.5 text-left transition-all duration-200',
            'hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-a40',
            selected
              ? 'border-primary-a40 bg-primary-a6 shadow-sm ring-1 ring-primary-a20 dark:bg-primary-a10'
              : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-700/90 dark:bg-slate-900/50 dark:hover:border-slate-600',
          ].join(' ')}
          aria-pressed={selected}>
          {selected ? (
            <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <Check size={12} strokeWidth={3} aria-hidden />
            </span>
          ) : null}
          <span
            className={[
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              selected
                ? 'bg-primary-a15 text-primary dark:bg-primary-a20'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            ].join(' ')}>
            <Icon size={20} strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 pr-6">
            <span className="block text-base font-semibold text-slate-900 dark:text-white">{mode.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {mode.description}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
