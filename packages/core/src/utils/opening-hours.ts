export interface DayShift {
  open: string;
  close: string;
}

/** Índice 0 = Dom ... 6 = Sáb; lista vazia = fechado. */
export type WeeklySchedule = DayShift[][];

export const WEEKDAY_SHORT_LABELS: readonly string[] = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_TOKEN_TO_INDEX: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

const SHIFT_PATTERN = /(\d{1,2})h(\d{2})?\s*(?:às|as)\s*(\d{1,2})h(\d{2})?/gi;
const DAY_TOKEN_PATTERN = /\b(dom|seg|ter|qua|qui|sex|sab)[a-z]*/g;
const RANGE_SEPARATOR_PATTERN = /^\s*(?:-|–|a|ate)\s*$/;

export function emptyWeeklySchedule(): WeeklySchedule {
  return Array.from({ length: 7 }, () => []);
}

function formatTime(time: string): string {
  const [hours = '0', minutes = '0'] = time.split(':');
  const hh = hours.padStart(2, '0');
  return Number(minutes) === 0 ? `${hh}h` : `${hh}h${minutes.padStart(2, '0')}`;
}

function formatShifts(shifts: DayShift[]): string {
  return shifts.map((s) => `${formatTime(s.open)} às ${formatTime(s.close)}`).join(' e ');
}

function formatDayRange(days: number[]): string {
  const first = WEEKDAY_SHORT_LABELS[days[0] ?? 0] ?? '';
  const last = WEEKDAY_SHORT_LABELS[days[days.length - 1] ?? 0] ?? '';
  return days.length === 1 ? first : `${first}-${last}`;
}

export function formatOpeningSchedule(schedule: WeeklySchedule): string {
  const keyOf = (day: number) => formatShifts(schedule[day] ?? []);
  const groups: { days: number[]; shifts: string }[] = [];

  for (const day of DISPLAY_ORDER) {
    const shifts = keyOf(day);
    if (!shifts) continue;
    const last = groups[groups.length - 1];
    const previousDay = DISPLAY_ORDER[DISPLAY_ORDER.indexOf(day) - 1];
    if (last && last.shifts === shifts && previousDay === last.days[last.days.length - 1]) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], shifts });
    }
  }

  const [only] = groups;
  if (only && groups.length === 1 && only.days.length === 7) {
    return `Todos os dias ${only.shifts}`;
  }
  return groups.map((g) => `${formatDayRange(g.days)} ${g.shifts}`).join('; ');
}

function normalizeTime(hours: string | undefined, minutes: string | undefined): string | null {
  const h = Number(hours);
  const m = Number(minutes ?? '0');
  if (!Number.isInteger(h) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseShifts(text: string): DayShift[] {
  const shifts: DayShift[] = [];
  for (const match of text.matchAll(SHIFT_PATTERN)) {
    const open = normalizeTime(match[1], match[2]);
    const close = normalizeTime(match[3], match[4]);
    if (open && close) shifts.push({ open, close });
  }
  return shifts;
}

function circularRange(start: number, end: number): number[] {
  const days: number[] = [];
  let day = start;
  for (let i = 0; i < 7; i++) {
    days.push(day);
    if (day === end) break;
    day = (day + 1) % 7;
  }
  return days;
}

function parseDays(daysPart: string): number[] {
  const normalized = daysPart.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (normalized.includes('todos os dias')) return [0, 1, 2, 3, 4, 5, 6];

  const tokens = [...normalized.matchAll(DAY_TOKEN_PATTERN)].flatMap((m) => {
    const index = DAY_TOKEN_TO_INDEX[m[1] ?? ''];
    return index === undefined ? [] : [{ index, start: m.index, end: m.index + m[0].length }];
  });

  const days: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    if (!token) continue;
    if (next && RANGE_SEPARATOR_PATTERN.test(normalized.slice(token.end, next.start))) {
      days.push(...circularRange(token.index, next.index));
      i++;
    } else {
      days.push(token.index);
    }
  }
  return days;
}

/**
 * Aceita tanto a saída de `formatOpeningSchedule` quanto textos livres legados
 * ("Qua, Sex, Sáb 21h às 03h", "Seg a Sáb, 18h às 02h"). Retorna null quando
 * nenhum segmento tem dias e horários reconhecíveis.
 */
export function parseOpeningSchedule(text: string): WeeklySchedule | null {
  const schedule = emptyWeeklySchedule();
  let recognized = false;

  for (const segment of text.split(';')) {
    const firstHour = segment.search(/\d{1,2}h/);
    if (firstHour < 0) continue;
    const days = parseDays(segment.slice(0, firstHour));
    const shifts = parseShifts(segment.slice(firstHour));
    if (days.length === 0 || shifts.length === 0) continue;
    recognized = true;
    for (const day of days) {
      schedule[day]?.push(...shifts.map((s) => ({ ...s })));
    }
  }

  return recognized ? schedule : null;
}
