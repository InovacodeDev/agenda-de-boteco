import {
  type DayShift,
  emptyWeeklySchedule,
  formatOpeningSchedule,
  parseOpeningSchedule,
  WEEKDAY_SHORT_LABELS,
  type WeeklySchedule,
} from '@agenda/core';
import { Icon, Pressable, Switch, Text, TimePickerField, View } from '@agenda/shared-ui-mobile';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const LUNCH_SHIFT: DayShift = { open: '08:00', close: '12:00' };
const NIGHT_SHIFT: DayShift = { open: '18:00', close: '00:00' };
const DEFAULT_SHIFTS: readonly DayShift[] = [LUNCH_SHIFT, NIGHT_SHIFT];

const MAX_SHIFTS_PER_DAY = 2;

function withComplementaryShift(shifts: DayShift[]): DayShift[] {
  const opensLate = (shifts[0]?.open ?? '') >= '12:00';
  const extra = opensLate ? LUNCH_SHIFT : NIGHT_SHIFT;
  return [...shifts, { ...extra }].sort((a, b) => a.open.localeCompare(b.open));
}

/**
 * Mesma grade do web-client: o valor gravado é o texto canônico de
 * `opening_hours`, lido pelo semáforo de "aberto agora" nos apps do consumidor.
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
      (schedule[day] ?? []).map((shift, index) =>
        index === shiftIndex ? { ...shift, ...patch } : shift,
      ),
    );

  const copyToAllDays = (day: number) => update(schedule.map(() => [...(schedule[day] ?? [])]));

  const firstOpenDay = DAY_ORDER.find((day) => (schedule[day] ?? []).length > 0);

  return (
    <View className="flex-col gap-3">
      {legacyText ? (
        <View className="rounded-xl border border-border bg-surface px-3.5 py-2.5">
          <Text className="font-body text-muted-foreground text-xs">
            Horário atual: <Text className="text-foreground">{legacyText}</Text>. Ative os dias
            abaixo para substituir.
          </Text>
        </View>
      ) : null}

      <View className="rounded-xl border border-border">
        {DAY_ORDER.map((day, position) => {
          const shifts = schedule[day] ?? [];
          const isOpen = shifts.length > 0;
          const dayLabel = WEEKDAY_SHORT_LABELS[day] ?? '';
          return (
            <View
              key={day}
              className={`flex-col gap-3 px-4 py-3.5 ${position > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-row items-center gap-3">
                <Switch
                  checked={isOpen}
                  onCheckedChange={(checked) => setDay(day, checked ? [...DEFAULT_SHIFTS] : [])}
                />
                <Text className="font-body-semibold text-foreground text-[15px]">{dayLabel}</Text>
                {isOpen ? null : (
                  <Text className="font-body text-muted-foreground ml-auto text-sm">Fechado</Text>
                )}
              </View>

              {isOpen ? (
                <View className="flex-col gap-2">
                  {shifts.map((shift, shiftIndex) => (
                    <View key={shiftIndex} className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <TimePickerField
                          value={shift.open}
                          onValueChange={(open) => setShift(day, shiftIndex, { open })}
                        />
                      </View>
                      <Text className="font-body text-muted-foreground text-sm">às</Text>
                      <View className="flex-1">
                        <TimePickerField
                          value={shift.close}
                          onValueChange={(close) => setShift(day, shiftIndex, { close })}
                        />
                      </View>
                      {shifts.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remover este horário de ${dayLabel}`}
                          onPress={() =>
                            setDay(
                              day,
                              shifts.filter((_, index) => index !== shiftIndex),
                            )
                          }
                          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
                        >
                          <Icon name="xmark" size={14} color="#a6a6a6" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}

                  {shifts.length < MAX_SHIFTS_PER_DAY ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDay(day, withComplementaryShift(shifts))}
                      className="self-start py-1.5"
                    >
                      <Text className="font-body-medium text-primary text-[13px]">
                        + Adicionar intervalo
                      </Text>
                    </Pressable>
                  ) : null}

                  {day === firstOpenDay ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => copyToAllDays(day)}
                      className="self-start py-1.5"
                    >
                      <Text className="font-body text-muted-foreground text-[13px]">
                        Usar este horário nos 7 dias
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
