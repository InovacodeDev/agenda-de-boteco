'use client';

import { DatePicker } from '@agenda/shared-ui';

export interface DateRangeFieldProps {
  value: { start: string; end: string } | null;
  onChange: (range: { start: string; end: string } | null) => void;
}

/** Intervalo de datas com dois DatePicker do design system. Espelha o mobile. */
export function DateRangeField({ value, onChange }: DateRangeFieldProps) {
  const start = value?.start ?? '';
  const end = value?.end ?? '';

  const handlePicked = (which: 'start' | 'end', iso: string) => {
    if (!iso) {
      onChange(null);
      return;
    }
    const next = {
      start: which === 'start' ? iso : start || iso,
      end: which === 'end' ? iso : end || iso,
    };
    // mantém start <= end, igual ao mobile
    onChange(next.start > next.end ? { start: next.end, end: next.start } : next);
  };

  return (
    <div className="flex gap-3">
      <DatePicker
        value={start}
        onValueChange={(v) => handlePicked('start', v)}
        placeholder="Data inicial"
        ariaLabel="Data inicial"
        className="flex-1"
      />
      <DatePicker
        value={end}
        onValueChange={(v) => handlePicked('end', v)}
        placeholder="Data final"
        ariaLabel="Data final"
        className="flex-1"
      />
    </div>
  );
}
