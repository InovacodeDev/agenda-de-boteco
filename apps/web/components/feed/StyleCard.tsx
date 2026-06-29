'use client';

import type { MusicStyle } from '@agenda/core';

import { cn } from '@/lib/cn';

export interface StyleCardProps {
  style: MusicStyle;
  selected?: boolean;
  onClick?: () => void;
}

/** Card do carrossel "Estilos em alta" (emoji + nome). */
export function StyleCard({ style, selected = false, onClick }: StyleCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Estilo ${style.name}`}
      onClick={onClick}
      className={cn(
        'flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-2xl border bg-card px-2 py-3 transition-opacity hover:opacity-80',
        selected ? 'border-primary' : 'border-transparent',
      )}
    >
      <span className="text-[22px]">{style.emoji}</span>
      <span
        className={cn(
          'truncate text-[12px] font-[family-name:var(--font-body)] font-medium',
          selected ? 'text-primary' : 'text-foreground',
        )}
      >
        {style.name}
      </span>
    </button>
  );
}
