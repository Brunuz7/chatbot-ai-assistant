import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Table, type Column } from './Table';
import {
  TablePagination,
  type TablePaginationProps,
  DEFAULT_PAGE_LIMIT,
  PAGE_LIMIT_OPTIONS,
} from './TablePagination';

interface DataListProps<T> {
  data: T[];
  columns: Column<T>[];
  renderCard: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  gridClassName?: string;
  /** Paginação controlada pelo servidor (ex.: API com page/limit). */
  pagination?: TablePaginationProps;
  /** Paginação no cliente quando `pagination` não é passada. Predefinido: true. */
  clientPaginate?: boolean;
  itemLabel?: string;
}

export function DataList<T extends { id: string | number }>({
  data,
  columns,
  renderCard,
  isLoading,
  emptyState,
  onRowClick,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  pagination: serverPagination,
  clientPaginate = true,
  itemLabel = 'registo',
}: DataListProps<T>) {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);

  const useClientPagination = !serverPagination && clientPaginate;

  useEffect(() => {
    if (useClientPagination) setPage(1);
  }, [data, useClientPagination]);

  const clientMeta = useMemo(() => {
    if (!useClientPagination) return null;
    const total = data.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = total === 0 ? 1 : Math.min(page, totalPages);
    return { total, totalPages, safePage };
  }, [data.length, limit, page, useClientPagination]);

  const displayData = useMemo(() => {
    if (!useClientPagination || !clientMeta) return data;
    const start = (clientMeta.safePage - 1) * limit;
    return data.slice(start, start + limit);
  }, [data, useClientPagination, clientMeta, limit]);

  const resolvedPagination: TablePaginationProps | undefined = serverPagination
    ? serverPagination
    : useClientPagination && clientMeta
      ? {
          page: clientMeta.safePage,
          limit,
          total: clientMeta.total,
          totalPages: clientMeta.totalPages,
          onPageChange: setPage,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
          itemLabel,
          limitOptions: [...PAGE_LIMIT_OPTIONS],
          disabled: isLoading,
        }
      : undefined;

  if (!isLoading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const paginationDisabled = isLoading || resolvedPagination?.disabled;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'table'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <List size={16} />
            <span>Tabela</span>
          </button>
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'grid'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <Table
          data={displayData}
          columns={columns}
          onRowClick={onRowClick}
          isLoading={isLoading}
          pagination={
            resolvedPagination
              ? { ...resolvedPagination, disabled: paginationDisabled }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <div className={gridClassName}>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-6 h-48 animate-pulse"
                />
              ))
            ) : (
              displayData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {renderCard(item)}
                </div>
              ))
            )}
          </div>
          {resolvedPagination ? (
            <TablePagination {...resolvedPagination} disabled={paginationDisabled} />
          ) : null}
        </div>
      )}
    </div>
  );
}
