import React from 'react';
import { X, Search } from 'lucide-react';
import { FieldControl } from './Input';

export type FilterChipOption = {
  value: string;
  label: string;
};

interface FilterBarProps {
  children?: React.ReactNode;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
}

type FilterChipsProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterChipOption[];
  'aria-label'?: string;
};

const filterBarHeightClass = 'h-10';

const chipBaseClass =
  `inline-flex shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition-colors ${filterBarHeightClass}`;

const chipActiveClass =
  'border-transparent bg-primary-a10 font-semibold text-primary';

const chipInactiveClass =
  'border-border bg-surface text-foreground-muted hover:border-primary-a30 hover:bg-surface-hover hover:text-foreground';

function FilterChips({ value, onChange, options, 'aria-label': ariaLabel = 'Filtros' }: FilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex min-w-0 flex-wrap items-center gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value === '' ? '__all__' : option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[chipBaseClass, active ? chipActiveClass : chipInactiveClass].join(' ')}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterBarRoot({
  children,
  onSearch,
  searchPlaceholder = 'Buscar...',
  searchValue = '',
}: FilterBarProps) {
  const hasSearch = Boolean(onSearch);
  const hasChips = React.Children.count(children) > 0;

  return (
    <div
      className="mb-6 flex w-full flex-wrap items-center gap-2 sm:gap-3"
      aria-label="Filtros da lista">
      {hasSearch ? (
        <div className="relative w-full max-w-[16rem] shrink-0 sm:max-w-xs">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-icon">
            <Search size={18} aria-hidden />
          </div>
          <FieldControl
            type="text"
            role="searchbox"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch!(e.target.value)}
            className={`${filterBarHeightClass} !py-0 pl-10 pr-10`}
            aria-label={searchPlaceholder}
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => onSearch!('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-foreground-icon transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Limpar busca">
              <X size={14} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {hasChips ? children : null}
    </div>
  );
}

export const FilterBar = Object.assign(FilterBarRoot, { Chips: FilterChips });
