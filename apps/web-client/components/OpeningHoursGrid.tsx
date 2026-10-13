'use client';

import {
  type DayShift,
  emptyWeeklySchedule,
  formatOpeningSchedule,
  parseOpeningSchedule,
  WEEKDAY_SHORT_LABELS,
  type WeeklySchedule,
} from '@agenda/core';
import { TimePicker } from '@agenda/shared-ui';
import { CopyIcon, PlusIcon, XIcon } from '@phosphor-icons/react';

/** Semana começando na segunda, como o dono lê o próprio horário. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Almoço e noite: o caso de bar que fecha à tarde e reabre. */
const LUNCH_SHIFT: DayShift = { open: '08:00', close: '12:00' };
const NIGHT_SHIFT: DayShift = { open: '18:00', close: '00:00' };
const DEFAULT_SHIFTS: readonly DayShift[] = [LUNCH_SHIFT, NIGHT_SHIFT];

const MAX_SHIFTS_PER_DAY = 2;

/** Quem já abre à noite ganha o turno do almoço, e vice-versa, em ordem de abertura. */
function withComplementaryShift(shifts: DayShift[]): DayShift[] {
  const opensLate = (shifts[0]?.open ?? '') >= '12:00';
  const extra = opensLate ? LUNCH_SHIFT : NIGHT_SHIFT;
  return [...shifts, { ...extra }].sort((a, b) => a.open.localeCompare(b.open));
}

/**
 * Grade semanal com até dois turnos por dia. O valor continua sendo o texto de
 * `opening_hours` (ex.: "Seg-Sex 08h às 12h e 18h às 00h"): os apps exibem o
 * texto como está e o semáforo de "aberto agora" lê o mesmo formato.
 */
export function OpeningHoursGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseOpeningSchedule(value);
  const schedule = parsed ?? emptyWeeklySchedule();
  const legacyText = parsed === null && value.trim() !== '' ? value.trim() : null;

  const update = (next: WeeklySchedule) => onChange(formatOpeningSchedule(next));

  const setDay = (day: number, shifts: DayShift[]) =>
    update(schedule.map((current, index) => (index === day ? shifts : current)));

  const setShift = (day: number, shiftIndex: number, patch: Partial<DayShift>) =>
    setDay(
      day,
      schedule[day].map((shift, index) => (index === shiftIndex ? { ...shift, ...patch } : shift)),
    );

  const copyToAllDays = (day: number) => update(schedule.map(() => [...schedule[day]]));

  // Uma única ação de "repetir" no primeiro dia aberto: o dono preenche a
  // segunda-feira e replica, sem um botão igual em cada linha.
  const firstOpenDay = DAY_ORDER.find((day) => schedule[day].length > 0);

  return (
    <div className="flex flex-col gap-3">
      {legacyText ? (
        <p className="border-border bg-surface/40 text-muted-foreground rounded-xl border px-3.5 py-2.5 text-[13px]">
          Horário atual: <span className="text-foreground">{legacyText}</span>. Ative os dias abaixo
          para substituir.
        </p>
      ) : null}

      <ul className="border-border divide-border bg-surface/20 divide-y rounded-xl border">
        {DAY_ORDER.map((day) => {
          const shifts = schedule[day];
          const isOpen = shifts.length > 0;
          const dayLabel = WEEKDAY_SHORT_LABELS[day];
          return (
            <li
              key={day}
              className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-4 py-3.5 sm:grid-cols-[8.5rem_1fr]"
            >
              <label className="flex cursor-pointer items-center gap-3 sm:h-12">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => setDay(day, e.target.checked ? [...DEFAULT_SHIFTS] : [])}
                  aria-label={`${dayLabel}: aberto`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="bg-surface-elevated peer-focus-visible:ring-primary peer-checked:bg-primary relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5"
                />
                <span className="text-foreground text-[15px] font-semibold">{dayLabel}</span>
                {isOpen ? null : (
                  <span className="text-muted-foreground ml-auto text-sm sm:hidden">Fechado</span>
                )}
              </label>

              {isOpen ? (
                <div className="flex flex-col gap-2">
                  {shifts.map((shift, shiftIndex) => (
                    <div key={shiftIndex} className="flex items-center gap-2">
                      <TimePicker
                        value={shift.open}
                        onValueChange={(open) => setShift(day, shiftIndex, { open })}
                        ariaLabel={`${dayLabel}: abre às`}
                        className="w-24 gap-2 tabular-nums sm:w-28"
                      />
                      <span className="text-muted-foreground text-sm">às</span>
                      <TimePicker
                        value={shift.close}
                        onValueChange={(close) => setShift(day, shiftIndex, { close })}
                        ariaLabel={`${dayLabel}: fecha às`}
                        className="w-24 gap-2 tabular-nums sm:w-28"
                      />
                      {shifts.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDay(
                              day,
                              shifts.filter((_, index) => index !== shiftIndex),
                            )
                          }
                          title="Remover este horário"
                          className="text-muted-foreground hover:text-foreground hover:bg-surface-elevated focus-visible:ring-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2"
                        >
                          <XIcon size={16} />
                          <span className="sr-only">Remover este horário de {dayLabel}</span>
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {shifts.length < MAX_SHIFTS_PER_DAY || day === firstOpenDay ? (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-0.5">
                      {shifts.length < MAX_SHIFTS_PER_DAY ? (
                        <button
                          type="button"
                          onClick={() => setDay(day, withComplementaryShift(shifts))}
                          className="text-primary focus-visible:ring-primary flex items-center gap-1.5 rounded text-[13px] font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                        >
                          <PlusIcon size={13} weight="bold" />
                          Adicionar intervalo
                        </button>
                      ) : null}
                      {day === firstOpenDay ? (
                        <button
                          type="button"
                          onClick={() => copyToAllDays(day)}
                          className="text-muted-foreground hover:text-foreground focus-visible:ring-primary flex items-center gap-1.5 rounded text-[13px] outline-none focus-visible:ring-2"
                        >
                          <CopyIcon size={14} />
                          Usar este horário nos 7 dias
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="text-muted-foreground hidden h-12 items-center text-sm sm:flex">
                  Fechado
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
