import React from 'react';
import { Check, CircleStop } from 'lucide-react';

type FlowNextStepPickerProps = {
  value: string;
  flows: { id: string; name: string }[];
  onChange: (flowId: string) => void;
};

export const FlowNextStepPicker: React.FC<FlowNextStepPickerProps> = ({ value, flows, onChange }) => (
  <motion
    className="flex flex-wrap gap-2"
    role="radiogroup"
    aria-label="Próxima etapa"
  >
    <button
      type="button"
      onClick={() => onChange('')}
      title="Terminar neste passo"
      className={chipClass(!value)}
      aria-pressed={!value}
    >
      {!value ? <Check size={14} className="shrink-0" aria-hidden /> : <CircleStop size={14} className="shrink-0 opacity-60" aria-hidden />}
      Fim
    </button>
    {flows.map((f) => {
      const selected = value === f.id;
      return (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          title={f.name}
          className={chipClass(selected)}
          aria-pressed={selected}
        >
          {selected ? <Check size={14} className="shrink-0" aria-hidden /> : null}
          <span className="truncate max-w-[12rem]">{f.name}</span>
        </button>
      );
    })}
  </motion>
);

function chipClass(selected: boolean) {
  return [
    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200',
    'hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    selected
      ? 'border-primary bg-primary text-white shadow-sm'
      : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  ].join(' ');
}

function motion({ className, role, 'aria-label': ariaLabel, children }: React.PropsWithChildren<{
  className?: string;
  role?: string;
  'aria-label'?: string;
}>) {
  return (
    <div className={className} role={role} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
