import React from 'react';
import { Check } from 'lucide-react';
import {
  FLOW_ACTION_OPTIONS,
  FLOW_ACTION_START,
  getActionAccentStyles,
  type FlowActionId,
} from './flowWizardConstants';

type FlowActionPickerProps = {
  value: string;
  onChange: (id: FlowActionId) => void;
  showStartOption?: boolean;
};

export const FlowActionPicker: React.FC<FlowActionPickerProps> = ({ value, onChange, showStartOption = false }) => {
  const options = showStartOption ? [...FLOW_ACTION_OPTIONS, FLOW_ACTION_START] : FLOW_ACTION_OPTIONS;

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
      role="radiogroup"
      aria-label="O que acontece neste passo?">
      {options.map((action) => {
        const selected = value === action.id;
        const styles = getActionAccentStyles(action.accent);
        const Icon = action.icon;

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onChange(action.id)}
            className={[
              'group relative flex min-h-[5.5rem] flex-col gap-2.5 rounded-xl border p-3 text-left transition-all duration-200',
              'hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-a40',
              selected
                ? `${styles.selected} ring-2 ${styles.ring} shadow-md`
                : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-700/90 dark:bg-slate-900/60 dark:hover:border-slate-600',
            ].join(' ')}
            aria-pressed={selected}>
            {selected ? (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
            ) : null}
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
              <Icon size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 pr-4">
              <span className="block text-base font-semibold leading-tight text-slate-900 dark:text-white">
                {action.title}
              </span>
              <span className="mt-1 block text-sm leading-snug text-slate-500 dark:text-slate-400">
                {action.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
