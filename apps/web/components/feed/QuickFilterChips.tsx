'use client';

import { type DateBucket, useFiltersStore } from '@agenda/core';

import { cn } from '@/lib/cn';

const DATE_CHIPS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
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

/** Chips rápidos do feed: Hoje, Amanhã, Fim de semana, Free, Perto de mim. */
export function QuickFilterChips() {
  const filters = useFiltersStore((state) => state.filters);
  const setDateBucket = useFiltersStore((state) => state.setDateBucket);
  const toggleFreeOnly = useFiltersStore((state) => state.toggleFreeOnly);
  const toggleNearMe = useFiltersStore((state) => state.toggleNearMe);

  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    </div>
  );
}
