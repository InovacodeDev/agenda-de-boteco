'use client';

export interface DateRangeFieldProps {
  value: { start: string; end: string } | null;
  onChange: (range: { start: string; end: string } | null) => void;
}

/** Intervalo de datas com dois <input type="date"> nativos. Espelha o mobile. */
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

  const inputClass =
    'flex-1 rounded-xl bg-card px-3 py-3 text-[14px] font-[family-name:var(--font-body)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="flex gap-3">
      <input
        type="date"
        aria-label="Data inicial"
        value={start}
        onChange={(e) => handlePicked('start', e.target.value)}
        className={inputClass}
      />
      <input
        type="date"
        aria-label="Data final"
        value={end}
        onChange={(e) => handlePicked('end', e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
