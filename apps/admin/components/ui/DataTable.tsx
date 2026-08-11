'use client';

import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
}: {
  columns: Column<T>[];
  rows: T[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-widest text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3.5 font-[family-name:var(--font-body)] font-semibold"
              >
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3.5 text-right font-[family-name:var(--font-body)] font-semibold">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-foreground">
                  {col.render(row)}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="rounded-full px-3 py-1.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
