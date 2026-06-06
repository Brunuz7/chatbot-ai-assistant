import React from 'react';
import { TablePagination, type TablePaginationProps } from './TablePagination';
import { TableHeader } from './TableHeader';
import { TableSkeleton } from './Skeleton';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  pagination?: Omit<TablePaginationProps, 'disabled'> & { disabled?: boolean };
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  isLoading,
  pagination,
}: TableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full border-collapse text-left">
          <TableHeader
            items={columns.map((column) => column.header)}
            columnClassNames={columns.map((column) => column.className)}
          />
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-foreground-muted">
                  Nenhum dado encontrado.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={`group transition-colors hover:bg-surface-hover ${onRowClick ? 'cursor-pointer' : ''}`}>
                  {columns.map((column, index) => (
                    <td
                      key={index}
                      className={`px-6 py-4 text-sm leading-normal text-foreground [&_*]:!text-sm [&_*]:!leading-normal ${column.className || ''}`}>
                      {typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : (item[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination ? <TablePagination {...pagination} disabled={isLoading || pagination.disabled} /> : null}
    </div>
  );
}
