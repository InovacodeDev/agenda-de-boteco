'use client';

import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';

import { SELECT_CLASS } from './styles';

type CalendarProps = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
};

function Calendar({ selected, onSelect, disabled }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      locale={ptBR}
      showOutsideDays
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === 'left' ? (
            <CaretLeftIcon {...props} size={16} weight="bold" />
          ) : (
            <CaretRightIcon {...props} size={16} weight="bold" />
          ),
      }}
      classNames={{
        root: `${defaultClassNames.root} text-foreground`,
        months: `${defaultClassNames.months} gap-4`,
        month: `${defaultClassNames.month} flex flex-col gap-3`,
        month_caption: `${defaultClassNames.month_caption} flex items-center justify-center h-9 text-[14px] font-semibold`,
        nav: `${defaultClassNames.nav} items-center`,
        button_previous: `${defaultClassNames.button_previous} h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground disabled:opacity-30`,
        button_next: `${defaultClassNames.button_next} h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground disabled:opacity-30`,
        weekdays: `${defaultClassNames.weekdays}`,
        weekday: `${defaultClassNames.weekday} text-[12px] font-medium text-muted-foreground`,
        week: `${defaultClassNames.week}`,
        day: `${defaultClassNames.day} p-0.5`,
        day_button: `${defaultClassNames.day_button} h-9 w-9 rounded-lg text-[14px] text-foreground hover:bg-surface-elevated disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-40`,
        today: `${defaultClassNames.today} font-semibold text-primary`,
        selected: `${defaultClassNames.selected} [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:opacity-90`,
        outside: `${defaultClassNames.outside} text-muted-foreground opacity-40`,
      }}
    />
  );
}

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
