import React, { useState } from 'react';
import { ChevronDown, X, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface FilterBarProps {
  children: React.ReactNode;
  onClear?: () => void;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  activeFiltersCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  children, 
  onClear, 
  onSearch, 
  searchPlaceholder = "Buscar...", 
  searchValue = "",
  activeFiltersCount = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasSearch = searchValue !== "";
  const hasActiveFilters = hasSearch || activeFiltersCount > 0;

  return (
    <div className="w-full mb-8">
      {/* Container Principal Unificado */}
      <div className={`
        bg-white dark:bg-slate-900 
        border border-slate-200 dark:border-slate-800 
        rounded-lg shadow-sm overflow-hidden 
        transition-all duration-300
        ${isOpen ? 'ring-1 ring-primary/20 border-primary/30' : ''}
      `}>
        
        {/* Barra Superior (Busca e Botão de Filtro) */}
        <div className="flex flex-col sm:flex-row items-center p-2 gap-2">
          
          {/* Busca */}
          {onSearch && (
            <div className="relative flex-1 w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder={searchPlaceholder} 
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800/40 border-none rounded-lg py-2.5 pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/10 text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm transition-all"
              />
              {searchValue && (
                <button 
                  onClick={() => onSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Botão Toggle Filtros */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className={`
                flex items-center justify-center gap-2 h-[40px] px-4 rounded-lg font-semibold text-sm transition-all whitespace-nowrap border
                ${isOpen 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700'}
              `}
            >
              <SlidersHorizontal size={16} className={isOpen ? 'text-primary' : ''} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && !isOpen && (
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Limpar Filtros */}
            {onClear && hasActiveFilters && (
              <button 
                onClick={onClear}
                className="flex items-center justify-center h-[40px] px-3 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-slate-200 dark:border-slate-800 hover:border-red-200"
                title="Limpar todos os filtros"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

            {/* Painel de Filtros (Conteúdo Interno) */}
        <div 
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isOpen ? 'max-h-[1000px] border-t border-slate-100 dark:border-slate-800' : 'max-h-0'}
          `}
        >
          <div className="p-6 bg-slate-50/30 dark:bg-slate-800/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


