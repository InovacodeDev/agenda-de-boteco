'use client';

import type { ReactNode } from 'react';

/**
 * Diferente do `Field` do painel, o rótulo aqui é associado por `htmlFor` em vez
 * de envolver o controle: o campo de estilos é um grupo de checkboxes, e uma
 * `<label>` externa envolvendo vários controles não tem alvo definido.
 */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className="text-[12px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="text-[12px] text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
