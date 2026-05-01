import React, { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Table } from './Table';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataListProps<T> {
  data: T[];
  columns: Column<T>[];
  renderCard: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  gridClassName?: string;
}

export function DataList<T extends { id: string | number }>({
  data,
  columns,
  renderCard,
  isLoading,
  emptyState,
  onRowClick,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
}: DataListProps<T>) {
  const [view, setView] = useState<'table' | 'grid'>('table');

  if (!isLoading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

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
        <Table data={data} columns={columns} onRowClick={onRowClick} isLoading={isLoading} />
      ) : (
        <div className={gridClassName}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-6 h-48 animate-pulse"></div>
            ))
          ) : (
            data.map((item) => (
              <div key={item.id} onClick={() => onRowClick?.(item)} className={onRowClick ? 'cursor-pointer' : ''}>
                {renderCard(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
