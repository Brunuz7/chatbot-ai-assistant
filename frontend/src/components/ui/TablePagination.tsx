import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export type TablePaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const DEFAULT_PAGE_LIMIT = 20;

export type TablePaginationProps = TablePaginationState & {
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function TablePagination({
  page,
  total,
  totalPages,
  onPageChange,
  disabled = false,
}: TablePaginationProps) {
  if (total === 0) return null;

  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;
  const pages = totalPages || 1;

  return (
    <div className="flex justify-end">
      <nav aria-label="Paginação" className="flex w-fit max-w-full items-center gap-4 text-sm text-foreground-muted">
        <span className="whitespace-nowrap">
          Página {page} de {pages}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev || disabled}
            aria-label="Página anterior"
            className="!px-2"
            onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft size={16} aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext || disabled}
            aria-label="Página seguinte"
            className="!px-2"
            onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      </nav>
    </div>
  );
}
