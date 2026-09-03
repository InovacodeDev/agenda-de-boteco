'use client';

import { cn } from '@agenda/core';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Linha com toggle ("Aberto agora — Apenas estabelecimentos abertos"). Espelha o mobile. */
export function SwitchRow({ title, subtitle, value, onValueChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-col gap-0.5 pr-4">
        <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => onValueChange(!value)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full outline-none transition-colors',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-popover',
          value ? 'bg-primary' : 'bg-surface-elevated',
        )}
      >
        {/* Geometria toda inline: as utilities de translate e left deste
            projeto não cobrem o caso e o thumb ficava parado no trilho.
            Trilho 48 − left 4 − thumb 20 − folga 4 = 20px de curso, o que
            mantém a mesma folga de 4px nas duas pontas. */}
        <span
          className="rounded-full bg-foreground"
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 20,
            height: 20,
            transform: `translateX(${value ? 20 : 0}px)`,
            transition: 'transform 200ms',
          }}
        />
      </button>
    </div>
  );
}
