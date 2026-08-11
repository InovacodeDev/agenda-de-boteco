'use client';

import { cn } from '@/lib/cn';

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
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-surface-elevated',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full bg-foreground transition-transform',
            value ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
