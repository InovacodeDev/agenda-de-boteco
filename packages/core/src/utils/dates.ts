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

const DAY_TOKEN_TO_INDEX: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sáb: 6,
  sab: 6,
};

function parseDays(daysPart: string): Set<number> {
  const normalized = daysPart.trim().toLowerCase();
  const all = new Set([0, 1, 2, 3, 4, 5, 6]);
  if (normalized.includes('todos os dias')) return all;

  const days = new Set<number>();
  const rangeMatch = normalized.match(
    /(dom|seg|ter|qua|qui|sex|sáb|sab)\s*-\s*(dom|seg|ter|qua|qui|sex|sáb|sab)/,
  );
  if (rangeMatch) {
    const start = DAY_TOKEN_TO_INDEX[rangeMatch[1]];
    const end = DAY_TOKEN_TO_INDEX[rangeMatch[2]];
    let d = start;
    // intervalo circular (ex: Sex-Dom)
    for (let i = 0; i < 7; i++) {
      days.add(d);
      if (d === end) break;
      d = (d + 1) % 7;
    }
    return days;
  }

  for (const token of normalized.matchAll(/dom|seg|ter|qua|qui|sex|sáb|sab/g)) {
    days.add(DAY_TOKEN_TO_INDEX[token[0]]);
  }
  return days;
}

interface OpeningWindow {
  openDays: Set<number>;
  openHour: number;
  closeHour: number;
  crossesMidnight: boolean;
}

/**
 * Extrai dias e horas de uma string de horário do protótipo. Retorna null
 * quando o formato não é reconhecido — chamadores devem degradar sem quebrar.
 */
function parseOpeningWindow(openingHours: string): OpeningWindow | null {
  const hoursMatch = openingHours.match(/(\d{1,2})h\s*às\s*(\d{1,2})h/i);
  if (!hoursMatch) return null;
  const openHour = Number(hoursMatch[1]);
  const closeHour = Number(hoursMatch[2]);

  const daysPart = openingHours.slice(0, openingHours.search(/\d{1,2}h/));
  const openDays = parseDays(daysPart);
  if (openDays.size === 0) return null;

  return { openDays, openHour, closeHour, crossesMidnight: closeHour <= openHour };
}

/**
 * Interpreta strings de horário do protótipo ("Ter-Dom 17h às 01h",
 * "Qua, Sex, Sáb 21h às 03h", "Todos os dias 16h às 02h") e diz se o
 * estabelecimento está aberto em `now`, tratando janelas que cruzam a
 * meia-noite. Retorna false para formatos não reconhecidos.
 */
export function isOpenNow(openingHours: string, now: Date = new Date()): boolean {
  const window = parseOpeningWindow(openingHours);
  if (!window) return false;
  const { openDays, openHour, closeHour, crossesMidnight } = window;

  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  // aberto hoje a partir de openHour
  if (openDays.has(day)) {
    if (!crossesMidnight && hour >= openHour && hour < closeHour) return true;
    if (crossesMidnight && hour >= openHour) return true;
  }
  // madrugada de uma janela iniciada ontem
  if (crossesMidnight) {
    const yesterday = (day + 6) % 7;
    if (openDays.has(yesterday) && hour < closeHour) return true;
  }
  return false;
}

/**
 * Horas até o fechamento da janela corrente; null se estiver fechado ou se o
 * formato não for reconhecido.
 */
export function hoursUntilNextClose(openingHours: string, now: Date = new Date()): number | null {
  const window = parseOpeningWindow(openingHours);
  if (!window) return null;
  const { openDays, openHour, closeHour, crossesMidnight } = window;
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  if (openDays.has(day)) {
    if (!crossesMidnight && hour >= openHour && hour < closeHour) return closeHour - hour;
    // janela que vira o dia: fecha em closeHour de amanhã
    if (crossesMidnight && hour >= openHour) return 24 - hour + closeHour;
  }
  if (crossesMidnight) {
    const yesterday = (day + 6) % 7;
    if (openDays.has(yesterday) && hour < closeHour) return closeHour - hour;
  }
  return null;
}

/**
 * Horas até a próxima abertura; null se nenhum dia abrir ou se o formato não
 * for reconhecido.
 */
export function hoursUntilNextOpen(openingHours: string, now: Date = new Date()): number | null {
  const window = parseOpeningWindow(openingHours);
  if (!window) return null;
  const { openDays, openHour } = window;
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  // hoje ainda vai abrir?
  if (openDays.has(day) && hour < openHour) return openHour - hour;

  // procura o próximo dia de abertura dentro da semana
  for (let offset = 1; offset <= 7; offset++) {
    if (openDays.has((day + offset) % 7)) {
      return offset * 24 - hour + openHour;
    }
  }
  return null;
}
