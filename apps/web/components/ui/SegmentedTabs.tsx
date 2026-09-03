'use client';

import { cn } from '@agenda/core';

export interface SegmentedTabsProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

/** Tabs em pill (Eventos/Bares) — ativa branca com texto primary, espelha o mobile. */
export function SegmentedTabs({ tabs, activeIndex, onChange, className }: SegmentedTabsProps) {
  return (
    <div className={cn('flex rounded-full bg-surface p-1', className)}>
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(index)}
            className={cn(
              'h-9 flex-1 rounded-full text-[13px] font-[family-name:var(--font-body)] font-medium transition-colors',
              active ? 'bg-foreground text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
