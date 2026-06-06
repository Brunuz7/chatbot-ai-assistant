import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronRight } from 'lucide-react';

export interface StepperStep {
  id: number;
  title: string;
  description?: string;
  /** Ícone da etapa (Lucide); se omitido, usa o número no círculo */
  icon?: LucideIcon;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
  compact?: boolean;
}

function StepSep() {
  return (
    <ChevronRight
      className="h-3.5 w-3.5 shrink-0 text-foreground-icon opacity-75 sm:h-4 sm:w-4"
      strokeWidth={2}
      aria-hidden
    />
  );
}

function CircleContent({
  step,
  currentStep,
  compactSize,
}: {
  step: StepperStep;
  currentStep: number;
  compactSize?: boolean;
}) {
  const Icon = step.icon;
  const done = currentStep > step.id;
  const active = currentStep === step.id;

  if (done)
    return <Check size={compactSize ? 13 : 18} className={compactSize ? 'xl:w-4 xl:h-4' : ''} strokeWidth={2.5} />;

  if (Icon) {
    return (
      <Icon
        size={compactSize ? 13 : 18}
        className={`${compactSize ? 'xl:h-[15px] xl:w-[15px]' : ''} ${active ? 'text-foreground-inverse' : 'text-foreground-icon'}`}
        strokeWidth={2}
      />
    );
  }
  return <span className={`font-bold ${compactSize ? 'text-[10px] xl:text-xs' : 'text-sm'}`}>{step.id}</span>;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className = '', compact = false }) => {
  if (compact) {
    const activeStep = steps.find((s) => s.id === currentStep) ?? steps[0];

    return (
      <div className={`w-full min-w-0 ${className}`}>
        {/* Mobile / tablet: ícones + separadores, quebra linha se precisar — sem scroll horizontal */}
        <div className="lg:hidden w-full">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground-muted">
              Etapa {currentStep} de {steps.length}
            </span>
            <span
              className="text-sm font-semibold text-primary truncate min-w-0 text-right"
              title={activeStep?.description}>
              {activeStep?.title}
            </span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-0 gap-y-2 px-0.5">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className="flex flex-col items-center gap-1 min-w-0"
                  title={step.description ? `${step.title}: ${step.description}` : step.title}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                      currentStep > step.id
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : currentStep === step.id
                          ? 'bg-primary text-white ring-2 ring-primary-a25 shadow-sm'
                          : 'bg-surface-muted'
                    }`}>
                    <CircleContent step={step} currentStep={currentStep} compactSize />
                  </div>
                  <span
                    className={`text-xs font-bold leading-none truncate max-w-[5rem] text-center sm:text-sm ${
                      currentStep === step.id ? 'text-primary' : 'text-foreground-muted'
                    }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 ? <StepSep /> : null}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Desktop lg+: mesma linguagem visual */}
        <div className="hidden lg:flex items-center justify-center w-full min-w-0 gap-1 xl:gap-2 flex-wrap lg:flex-nowrap">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className="flex items-center gap-2 xl:gap-2.5 min-w-0 flex-1 justify-center max-w-[19%]"
                title={step.description ? `${step.title}: ${step.description}` : step.title}>
                <div
                  className={`w-8 h-8 xl:w-9 xl:h-9 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                    currentStep > step.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : currentStep === step.id
                        ? 'bg-primary text-white ring-2 ring-primary-a25 shadow-sm'
                        : 'bg-surface-muted'
                  }`}>
                  <CircleContent step={step} currentStep={currentStep} compactSize />
                </div>
                <span
                  className={`text-xs xl:text-sm font-bold leading-tight truncate min-w-0 ${
                    currentStep === step.id ? 'text-primary' : 'text-foreground-muted'
                  }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 ? <StepSep /> : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-start justify-center gap-1 sm:gap-2 w-full flex-wrap sm:flex-nowrap">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1 min-w-[4.5rem] max-w-[22%] sm:max-w-none">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                  currentStep > step.id
                    ? 'bg-emerald-500 text-white'
                    : currentStep === step.id
                      ? 'bg-primary text-white ring-4 ring-primary-a20'
                      : 'bg-surface-muted'
                }`}>
                <CircleContent step={step} currentStep={currentStep} />
              </div>
              <div className="mt-2 text-center w-full px-0.5">
                <p
                  className={`truncate text-xs font-bold ${currentStep === step.id ? 'text-primary' : 'text-foreground-muted'}`}>
                  {step.title}
                </p>
                {step.description ? (
                  <p className="hidden line-clamp-2 text-[10px] text-foreground-icon md:block">{step.description}</p>
                ) : null}
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div className="flex items-center self-start mt-[1.125rem] shrink-0 px-px sm:px-0.5" aria-hidden>
                <StepSep />
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
