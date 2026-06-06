import React from 'react';
import { Check, CircleStop } from 'lucide-react';
import {
  FLOW_NEXT_STEP_CHIP_BASE,
  FLOW_NEXT_STEP_CHIP_IDLE,
  FLOW_NEXT_STEP_CHIP_SELECTED,
} from './flowNextStepChipClasses';

type FlowNextStepPickerProps = {
  value: string;
  flows: { id: string; name: string }[];
  onChange: (flowId: string) => void;
};

export const FlowNextStepPicker: React.FC<FlowNextStepPickerProps> = ({ value, flows, onChange }) => (
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Próxima etapa">
    <button
      type="button"
      onClick={() => onChange('')}
      title="Terminar neste passo"
      className={`${FLOW_NEXT_STEP_CHIP_BASE} ${!value ? FLOW_NEXT_STEP_CHIP_SELECTED : FLOW_NEXT_STEP_CHIP_IDLE}`}
      aria-pressed={!value}>
      {!value ? (
        <Check size={14} className="shrink-0" aria-hidden />
      ) : (
        <CircleStop size={14} className="shrink-0 opacity-60" aria-hidden />
      )}
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
          className={`${FLOW_NEXT_STEP_CHIP_BASE} ${selected ? FLOW_NEXT_STEP_CHIP_SELECTED : FLOW_NEXT_STEP_CHIP_IDLE}`}
          aria-pressed={selected}>
          {selected ? <Check size={14} className="shrink-0" aria-hidden /> : null}
          <span className="truncate max-w-[12rem]">{f.name}</span>
        </button>
      );
    })}
  </div>
);
