'use client';

import { CalendarBlankIcon } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';

import { Calendar } from './Calendar';
import { SELECT_CLASS } from './styles';

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function DatePicker({
  value,
  onValueChange,
  className = '',
  placeholder = 'Selecione',
  disabled,
  ariaLabel,
}: {
  /** 'YYYY-MM-DD', ou '' sem data escolhida — mesmo formato de <input type="date">. */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateOnly(value) : undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={ariaLabel}
        className={`${SELECT_CLASS} flex items-center justify-between ${className} pr-3`}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? DATE_FORMAT.format(selected) : placeholder}
        </span>
        <CalendarBlankIcon size={16} weight="bold" className="text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="border-border bg-card z-50 rounded-2xl border p-3 shadow-lg"
        >
          <Calendar
            selected={selected}
            disabled={disabled}
            onSelect={(date) => {
              onValueChange(date ? formatDateOnly(date) : '');
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Meio-dia local evita o dia rolar para trás/frente ao cruzar fusos na
// serialização — mesma armadilha documentada em EventForm.toLocalIso.
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
