import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export function Table<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick,
  isLoading 
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-t-lg mb-1"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            {columns.map((column, index) => (
              <th 
                key={index} 
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-500">
                Nenhum dado encontrado.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column, index) => (
                  <td 
                    key={index} 
                    className={`px-6 py-4 text-sm text-slate-700 dark:text-slate-300 ${column.className || ''}`}
                  >
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
  );
}
