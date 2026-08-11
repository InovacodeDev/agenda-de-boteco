import { type EstablishmentAttribute, getAttributeMeta } from '@agenda/core';

import { AttributeIcon } from '@/components/ui/icons';

export interface AttributeChipsProps {
  attributes: readonly EstablishmentAttribute[];
  /** Teto de chips exibidos; o excedente vira um "+N". Sem limite quando ausente. */
  max?: number;
}

/**
 * Chips de diferenciais do bar, usados nos cards de bar e de evento. A descrição
 * de cada diferencial vira tooltip nativa (`title`).
 */
export function AttributeChips({ attributes, max }: AttributeChipsProps) {
  if (attributes.length === 0) return null;

  const visible = max === undefined ? attributes : attributes.slice(0, max);
  const hiddenCount = attributes.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((attributeId) => {
        const meta = getAttributeMeta(attributeId);
        return (
          <span
            key={attributeId}
            title={meta.description}
            className="flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-[family-name:var(--font-body)] text-muted-foreground"
          >
            <AttributeIcon icon={meta.icon} size={10} />
            {meta.label}
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <span className="text-[10px] font-[family-name:var(--font-body)] text-muted-foreground">
          {`+${hiddenCount}`}
        </span>
      ) : null}
    </div>
  );
}
