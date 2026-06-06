import React from 'react';

/** Primeira letra maiúscula; restante em minúsculas (ex.: «NOME» → «Nome»). */
export function formatTableHeaderLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

export type TableHeaderProps = {
  /** Rótulos das colunas (apenas texto; sem conteúdo React). */
  items: string[];
  /** Classes de alinhamento/largura por coluna (opcional, mesma ordem que `items`). */
  columnClassNames?: (string | undefined)[];
};

export function TableHeader({ items, columnClassNames }: TableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-border bg-table-header">
        {items.map((item, index) => (
          <th
            key={`${item}-${index}`}
            className={['px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-table-header-text', columnClassNames?.[index]]
              .filter(Boolean)
              .join(' ')}>
            {formatTableHeaderLabel(item)}
          </th>
        ))}
      </tr>
    </thead>
  );
}
