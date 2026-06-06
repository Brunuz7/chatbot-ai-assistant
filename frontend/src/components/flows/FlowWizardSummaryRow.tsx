import React from 'react';

type FlowWizardSummaryRowProps = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
};

export function FlowWizardSummaryRow({ label, value, icon: Icon }: FlowWizardSummaryRowProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
      <dt className="shrink-0 text-sm font-medium leading-normal text-slate-500">{label}</dt>
      <dd className="flex items-start gap-2 text-base font-medium leading-normal text-slate-500 sm:max-w-[65%] sm:text-right">
        {Icon ? <Icon size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /> : null}
        <span className="text-left sm:text-right">{value}</span>
      </dd>
    </div>
  );
}
