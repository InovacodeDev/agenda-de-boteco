'use client';

import { cn, type DateBucket, QUICK_ATTRIBUTE_METAS, useFiltersStore } from '@agenda/core';

const DATE_CHIPS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

function Chip({
  label,
  selected,
  onClick,
  title,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Tooltip nativa — usada pelos chips de atributo para explicar o que filtram. */
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={title}
      className={cn(
        'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-[family-name:var(--font-body)] font-medium transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-surface-elevated text-muted-foreground',
      )}
    >
      {label}
    </button>
  );
}

export interface QuickFilterChipsProps {
  /**
   * Aba Bares (`false`) esconde os chips de data/Free/Perto de mim: esses filtros
   * são propriedades do evento e `applyEstablishmentFilters` não os consome, então
   * na lista de bares eles ficariam clicáveis sem efeito nenhum.
   */
  showEventFilters?: boolean;
}

/**
 * Chips rápidos do feed. Aba Eventos: data, Free, Perto de mim e os 5 atributos
 * em destaque. Aba Bares: só os atributos.
 */
export function QuickFilterChips({ showEventFilters = true }: QuickFilterChipsProps) {
  const filters = useFiltersStore((state) => state.filters);
  const setDateBucket = useFiltersStore((state) => state.setDateBucket);
  const toggleFreeOnly = useFiltersStore((state) => state.toggleFreeOnly);
  const toggleNearMe = useFiltersStore((state) => state.toggleNearMe);
  const toggleAttribute = useFiltersStore((state) => state.toggleAttribute);

  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {showEventFilters ? (
        <>
          {DATE_CHIPS.map(({ label, bucket }) => (
            <Chip
              key={bucket}
              label={label}
              selected={!filters.dateRange && filters.dateBucket === bucket}
              onClick={() => setDateBucket(filters.dateBucket === bucket ? 'any' : bucket)}
            />
          ))}
          <Chip label="Free" selected={filters.freeOnly} onClick={toggleFreeOnly} />
          <Chip label="Perto de mim" selected={filters.nearMe} onClick={toggleNearMe} />
        </>
      ) : null}
      {QUICK_ATTRIBUTE_METAS.map((meta) => (
        <Chip
          key={meta.id}
          label={meta.label}
          title={meta.description}
          selected={filters.attributeIds.includes(meta.id)}
          onClick={() => toggleAttribute(meta.id)}
        />
      ))}
    </div>
  );
}
