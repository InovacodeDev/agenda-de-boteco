'use client';

import { ClockIcon } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import { useMemo, useRef, useState } from 'react';

import { SELECT_CLASS } from './styles';

function buildSlots(stepMinutes: number): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export function TimePicker({
  value,
  onValueChange,
  className = '',
  placeholder = 'Selecione',
  stepMinutes = 30,
  ariaLabel,
}: {
  /** 'HH:MM', ou '' sem horário escolhido — mesmo formato de <input type="time">. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Intervalo entre horários da lista, em minutos. */
  stepMinutes?: number;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const slots = useMemo(() => buildSlots(stepMinutes), [stepMinutes]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Rola até o horário atual (ou o mais próximo) ao abrir, para não
          // exigir scroll manual quando o valor já está longe do topo da lista.
          requestAnimationFrame(() => {
            listRef.current
              ?.querySelector('[data-selected="true"]')
              ?.scrollIntoView({ block: 'center' });
          });
        }
      }}
    >
      <Popover.Trigger
        aria-label={ariaLabel}
        className={`${SELECT_CLASS} flex items-center justify-between ${className} pr-3`}
      >
        <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder}</span>
        <ClockIcon size={16} weight="bold" className="text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="border-border bg-card z-50 max-h-64 w-[--radix-popover-trigger-width] overflow-hidden rounded-2xl border p-1 shadow-lg"
        >
          {/* scrollbar-width cobre Firefox via style inline (que não depende do
              scan do Tailwind sobre este pacote); ::-webkit-scrollbar exige a
              tag <style> porque é pseudo-elemento, inexpressável em style inline. */}
          <style>{'[data-slot="time-picker-list"]::-webkit-scrollbar { display: none; }'}</style>
          <div
            ref={listRef}
            data-slot="time-picker-list"
            className="max-h-64 overflow-y-auto p-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                data-selected={slot === value}
                onClick={() => {
                  onValueChange(slot);
                  setOpen(false);
                }}
                className={`hover:bg-surface-elevated flex h-10 w-full items-center rounded-lg pr-4 pl-4 text-left text-[14px] outline-none ${
                  slot === value
                    ? 'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90'
                    : 'text-foreground'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
