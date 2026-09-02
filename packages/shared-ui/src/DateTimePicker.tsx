'use client';

import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

export function DateTimePicker({
  dateValue,
  onDateChange,
  timeValue,
  onTimeChange,
  className = '',
  datePlaceholder = 'Selecione',
  timePlaceholder = 'Selecione',
  stepMinutes = 30,
  disabledDate,
}: {
  /** 'YYYY-MM-DD', ou '' sem data escolhida. */
  dateValue: string;
  onDateChange: (value: string) => void;
  /** 'HH:MM', ou '' sem horário escolhido. */
  timeValue: string;
  onTimeChange: (value: string) => void;
  className?: string;
  datePlaceholder?: string;
  timePlaceholder?: string;
  stepMinutes?: number;
  disabledDate?: (date: Date) => boolean;
}) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <DatePicker
        value={dateValue}
        onValueChange={onDateChange}
        placeholder={datePlaceholder}
        disabled={disabledDate}
        className="flex-[3]"
      />
      <TimePicker
        value={timeValue}
        onValueChange={onTimeChange}
        placeholder={timePlaceholder}
        stepMinutes={stepMinutes}
        className="flex-[2]"
      />
    </div>
  );
}
