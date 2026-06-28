import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-skeleton ${className}`}
      aria-hidden
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface">
      <Skeleton className="h-11 w-full rounded-none rounded-t-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-6 py-4 last:border-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  className = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FormBlockSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy aria-label="A carregar">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className={`h-10 w-full ${i === rows - 1 ? 'min-h-[200px]' : ''}`} />
        </div>
      ))}
    </div>
  );
}

export function StatMetricCardSkeleton() {
  return (
    <div className="flex items-center gap-4" aria-busy aria-label="A carregar métrica">
      <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function ChartAreaSkeleton() {
  return (
    <div className="flex h-full min-h-[200px] flex-col justify-end gap-2 px-2 pb-2" aria-busy aria-label="A carregar gráfico">
      <div className="flex h-full items-end justify-between gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="w-full max-w-[2.5rem] rounded-t-md" style={{ height: `${35 + (i % 4) * 15}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function SummaryPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="mt-4 flex flex-col gap-3.5" aria-busy aria-label="A carregar resumo">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-36" />
          </div>
        </li>
      ))}
      <li className="mt-2 flex items-center gap-2 border-t border-border-subtle pt-4">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </li>
    </ul>
  );
}

export function ConnectionPanelSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5" aria-busy aria-label="A carregar conexões">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
    </div>
  );
}

export function PageShellSkeleton() {
  return (
    <div className="animate-fade-in space-y-6 p-1" aria-busy aria-label="A carregar página">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-xl rounded-lg" />
      <TableSkeleton rows={6} />
    </div>
  );
}

export function ModalMessagesSkeleton() {
  return (
    <ul className="space-y-3 py-2" aria-busy aria-label="A carregar mensagens">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <Skeleton className={`h-16 rounded-xl ${i % 2 === 0 ? 'w-4/5' : 'w-3/5'}`} />
        </li>
      ))}
    </ul>
  );
}

export function InlineSwitchSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}
