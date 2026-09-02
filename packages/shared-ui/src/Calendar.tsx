'use client';

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';

type CalendarProps = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
};

// Wrapper fino do react-day-picker com o vocabulário visual do painel (mesmos
// tokens do Select: rounded-2xl, bg-card, bg-primary no selecionado). Ícone de
// navegação vem do Phosphor, igual ao resto do repo, não do pacote de calendário.
export function Calendar({ selected, onSelect, disabled }: CalendarProps) {
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
