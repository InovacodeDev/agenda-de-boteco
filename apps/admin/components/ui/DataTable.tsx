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
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Ações</th>
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
                    className="rounded-lg px-2 py-1 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="rounded-lg px-2 py-1 text-[13px] text-destructive hover:bg-destructive/10"
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
