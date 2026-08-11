'use client';

import type { ReactNode } from 'react';

export interface FilterSectionProps {
  title: string;
  /** Valor exibido à direita do título (ex: "50 km", "Sem limite") */
  trailing?: string;
  children: ReactNode;
}

/** Seção da página de filtros: título semibold + conteúdo. Espelha o mobile. */
export function FilterSection({ title, trailing, children }: FilterSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          {title}
        </span>
        {trailing ? (
          <span className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
            {trailing}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
