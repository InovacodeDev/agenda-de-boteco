'use client';

import { formatPrice, type MenuItem } from '@agenda/core';

export interface EstablishmentDetailMenuItemProps {
  item: MenuItem;
}

/** Linha do cardápio (nome + preço). Espelha o MenuItemRow do mobile. */
export function EstablishmentDetailMenuItem({ item }: EstablishmentDetailMenuItemProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5">
      <span className="text-[14px] font-[family-name:var(--font-body)] text-foreground">
        {item.name}
      </span>
      <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary">
        {formatPrice(item.price)}
      </span>
    </div>
  );
}
