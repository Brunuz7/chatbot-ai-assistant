import type { LucideIcon } from 'lucide-react';
import { dashboardMutedTextClass } from './dashboardTheme';

type DashboardChartEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function DashboardChartEmpty({ icon: Icon, title, description }: DashboardChartEmptyProps) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-6 py-10 text-center"
      role="status">
      <Icon
        size={40}
        className={`mb-4 ${dashboardMutedTextClass}`}
        strokeWidth={1.5}
        aria-hidden
      />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className={`mt-2 max-w-sm text-xs leading-relaxed ${dashboardMutedTextClass}`}>
        {description}
      </p>
    </div>
  );
}
