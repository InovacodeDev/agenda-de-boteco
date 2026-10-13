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

  return (
    <div className="flex flex-col gap-3">
      {legacyText ? (
        <p className="border-border bg-surface/40 text-muted-foreground rounded-xl border px-3.5 py-2.5 text-[13px]">
          Horário atual: <span className="text-foreground">{legacyText}</span>. Marque os dias
          abaixo para substituir.
        </p>
      ) : null}

      <ul className="border-border divide-border divide-y rounded-xl border">
        {DAY_ORDER.map((day) => {
          const shifts = schedule[day];
          const isOpen = shifts.length > 0;
          return (
            <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <label className="flex w-28 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => setDay(day, e.target.checked ? [...DEFAULT_SHIFTS] : [])}
                  className="accent-primary h-4.5 w-4.5"
                />
                <span className="text-foreground text-sm font-medium">
                  {WEEKDAY_SHORT_LABELS[day]}
                </span>
              </label>

              {isOpen ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {shifts.map((shift, shiftIndex) => (
                    <div key={shiftIndex} className="flex items-center gap-1.5">
                      <TimePicker
                        value={shift.open}
                        onValueChange={(open) => setShift(day, shiftIndex, { open })}
                        ariaLabel={`${WEEKDAY_SHORT_LABELS[day]}: abre às`}
                        className="w-24"
                      />
                      <span className="text-muted-foreground text-sm">às</span>
                      <TimePicker
                        value={shift.close}
                        onValueChange={(close) => setShift(day, shiftIndex, { close })}
                        ariaLabel={`${WEEKDAY_SHORT_LABELS[day]}: fecha às`}
                        className="w-24"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDay(
                            day,
                            shifts.filter((_, index) => index !== shiftIndex),
                          )
                        }
                        title="Remover horário"
                        className="text-muted-foreground hover:text-foreground rounded-full p-1.5 transition-colors"
                      >
                        <XIcon size={14} />
                        <span className="sr-only">Remover horário</span>
                      </button>
                    </div>
                  ))}

                  {shifts.length < MAX_SHIFTS_PER_DAY ? (
                    <button
                      type="button"
                      onClick={() => setDay(day, withComplementaryShift(shifts))}
                      className="text-primary flex items-center gap-1 text-[13px] font-medium hover:underline"
                    >
                      <PlusIcon size={12} weight="bold" />
                      Intervalo
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => copyToAllDays(day)}
                    className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-[13px]"
                  >
                    <CopyIcon size={13} />
                    Copiar para todos
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Fechado</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
