import { parseOpeningSchedule } from './opening-hours';

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export interface BuildEventDateOptions {
  minute?: number;
  /** Base injetável para determinismo nos testes (default: agora) */
  base?: Date;
}

/**
 * Réplica do helper de datas do protótipo: data relativa a uma base,
 * com hora/minuto fixos.
 */
export function buildEventDate(
  daysOffset: number,
  hour: number,
  options: BuildEventDateOptions = {},
): string {
  const { minute = 0, base = new Date() } = options;
  const date = new Date(base);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/**
 * Desloca um ISO em N semanas ou N meses preservando o horário local.
 *
 * 'monthly' clampa no último dia do mês em vez de transbordar: 31/jan + 1 mês é
 * 28/fev (ou 29 em ano bissexto), não 3/mar — `setMonth` sozinho transbordaria,
 * e uma recorrência mensal que pula para o mês seguinte deixa de ser mensal.
 */
export function shiftDate(
  iso: string,
  amount: number,
  unit: 'weekly' | 'monthly',
): string {
  const date = new Date(iso);
  if (unit === 'weekly') {
    date.setDate(date.getDate() + amount * 7);
    return date.toISOString();
  }
  const targetDay = date.getDate();
  // Dia 1 antes de mover o mês: evita o transbordo intermediário do setMonth.
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(targetDay, lastDayOfTargetMonth));
  return date.toISOString();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(iso: string, now: Date): number {
  const target = startOfDay(new Date(iso)).getTime();
  const today = startOfDay(now).getTime();
  return Math.round((target - today) / 86_400_000);
}

/**
 * 'Hoje' | 'Amanhã' | dia da semana ('Sex') até 6 dias | '17 De Jun.' além.
 * Mesmo formato exibido nos cards do protótipo.
 */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const diff = dayDiff(iso, now);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  const date = new Date(iso);
  if (diff > 1 && diff <= 6) return WEEKDAYS_PT[date.getDay()];
  return `${String(date.getDate()).padStart(2, '0')} De ${MONTHS_PT[date.getMonth()]}.`;
}

/**
 * 'Qui., 22 de out.' — dia da semana abreviado + dia + mês, formato da agenda do
 * painel do dono. Diferente de formatRelativeDay (que troca por 'Hoje'/'Amanhã'
 * e some com o mês na semana corrente): aqui o dono compara datas de uma lista,
 * então toda linha precisa mostrar a data inteira.
 *
 * Com `withTime`, anexa o horário: 'Sex., 25 de set. • 18:00'.
 */
export function formatEventDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  const weekday = WEEKDAYS_PT[date.getDay()];
  const month = MONTHS_PT[date.getMonth()].toLowerCase();
  const day = `${weekday}., ${date.getDate()} de ${month}.`;
  return withTime ? `${day} • ${formatTime(iso)}` : day;
}

/** '20:00' no fuso local */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** '20:00 – 23:30' no fuso local; só o início quando coincidem. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = formatTime(startIso);
  const end = formatTime(endIso);
  return start === end ? start : `${start} – ${end}`;
}

/**
 * Tempo relativo no formato curto do protótipo: 'agora', 'X min', 'X h', 'X d'.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

/** Sábado ou domingo, no fuso local */
export function isWeekend(iso: string): boolean {
  const day = new Date(iso).getDay();
  return day === 0 || day === 6;
}

const HOURS_PER_WEEK = 168;

interface WeekInterval {
  start: number;
  end: number;
}

function timeToHours(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) + Number(minutes) / 60;
}

/**
 * Cada turno vira um intervalo em horas da semana (Dom 00h = 0). Fechar em
 * horário <= abertura significa virar o dia; `end` pode passar de 168 no
 * sábado, e por isso o instante consultado é testado também com +168.
 */
function weekIntervals(openingHours: string): WeekInterval[] | null {
  const schedule = parseOpeningSchedule(openingHours);
  if (!schedule) return null;
  return schedule.flatMap((shifts, day) =>
    shifts.map((shift) => {
      const start = day * 24 + timeToHours(shift.open);
      const close = day * 24 + timeToHours(shift.close);
      return { start, end: close <= start ? close + 24 : close };
    }),
  );
}

function weekHour(now: Date): number {
  return now.getDay() * 24 + now.getHours() + now.getMinutes() / 60;
}

function hoursUntilEndOfCurrentShift(intervals: WeekInterval[], now: Date): number | null {
  const t = weekHour(now);
  for (const { start, end } of intervals) {
    for (const probe of [t, t + HOURS_PER_WEEK]) {
      if (probe >= start && probe < end) return end - probe;
    }
  }
  return null;
}

/**
 * Interpreta o horário semanal (formato de `formatOpeningSchedule` ou texto
 * livre legado como "Ter-Dom 17h às 01h") com vários turnos por dia e turnos
 * que cruzam a meia-noite. Retorna false para formatos não reconhecidos.
 */
export function isOpenNow(openingHours: string, now: Date = new Date()): boolean {
  const intervals = weekIntervals(openingHours);
  if (!intervals) return false;
  return hoursUntilEndOfCurrentShift(intervals, now) !== null;
}

/**
 * Horas até o fechamento do turno corrente; null se estiver fechado ou se o
 * formato não for reconhecido.
 */
export function hoursUntilNextClose(openingHours: string, now: Date = new Date()): number | null {
  const intervals = weekIntervals(openingHours);
  if (!intervals) return null;
  return hoursUntilEndOfCurrentShift(intervals, now);
}

/**
 * Horas até a próxima abertura de turno (estritamente futura); null se nenhum
 * dia abrir ou se o formato não for reconhecido.
 */
export function hoursUntilNextOpen(openingHours: string, now: Date = new Date()): number | null {
  const intervals = weekIntervals(openingHours);
  if (!intervals || intervals.length === 0) return null;
  const t = weekHour(now);
  const waits = intervals.flatMap(({ start }) =>
    [start, start + HOURS_PER_WEEK].map((s) => s - t).filter((wait) => wait > 0),
  );
  return waits.length === 0 ? null : Math.min(...waits);
}

