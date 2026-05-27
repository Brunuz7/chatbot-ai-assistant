import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Input';

export type TablePaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const DEFAULT_PAGE_LIMIT = 20;
export const PAGE_LIMIT_OPTIONS = [20, 50] as const;

export type TablePaginationProps = TablePaginationState & {
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  limitOptions?: number[];
};

export function TablePagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled = false,
  itemLabel = 'registo',
  limitOptions = [...PAGE_LIMIT_OPTIONS],
}: TablePaginationProps) {
  if (total === 0 && !onLimitChange) return null;

  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;
  const plural = total !== 1 ? 's' : '';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {total > 0 ? (
          <>
            {total} {itemLabel}
            {plural} · página {page} de {totalPages || 1}
          </>
        ) : (
          <>Nenhum {itemLabel} encontrado</>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {onLimitChange ? (
          <div className="flex items-center gap-2 mr-1">
            <label htmlFor="table-page-limit" className="text-xs text-slate-500 whitespace-nowrap">
              Por página
            </label>
            <Select
              id="table-page-limit"
              value={String(limit)}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={disabled}
              className="!py-1.5 !text-sm min-w-[4.5rem]"
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev || disabled}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft size={16} aria-hidden />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext || disabled}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
