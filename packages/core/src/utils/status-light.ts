import { hoursUntilNextClose, hoursUntilNextOpen, isOpenNow } from './dates';

/**
 * Cores do semáforo, na ordem do ciclo de vida. O consumidor mapeia cada
 * tom para o token visual da sua plataforma — este módulo não conhece tema.
 */
export type StatusLightTone = 'yellow' | 'green' | 'orange' | 'red';

export interface StatusLight {
  tone: StatusLightTone;
  /** Texto curto para o card (ex.: 'Faltam 2 dias', 'Rolando agora'). */
  label: string;
}

const HOUR_MS = 3_600_000;

/** Arredonda para baixo, mas nunca abaixo de 1 — 'faltam 0 h' não informa nada. */
function atLeastOne(value: number): number {
  return Math.max(1, Math.floor(value));
}

/**
 * Semáforo do evento a partir das datas de início e fim:
 * amarelo antes de começar · verde rolando · laranja na última hora ·
 * vermelho depois de terminar.
 *
 * Retorna null quando as datas são inválidas, para o card simplesmente
 * omitir o selo em vez de exibir informação errada.
 */
export function eventStatusLight(
  startsAt: string,
  endsAt: string,
  now: Date = new Date(),
): StatusLight | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  const current = now.getTime();

  if (current >= end) {
    return { tone: 'red', label: 'Encerrado' };
  }

  if (current >= start) {
    const hoursLeft = (end - current) / HOUR_MS;
    if (hoursLeft <= 1) {
      return { tone: 'orange', label: 'Termina em breve' };
    }
    return { tone: 'green', label: 'Rolando agora' };
  }

  const hoursToStart = (start - current) / HOUR_MS;
  if (hoursToStart < 1) {
    const minutes = atLeastOne((start - current) / 60_000);
    return { tone: 'yellow', label: `Começa em ${minutes} min` };
  }
  if (hoursToStart < 24) {
    const hours = atLeastOne(hoursToStart);
    return { tone: 'yellow', label: `Faltam ${hours}h` };
  }
  const days = atLeastOne(hoursToStart / 24);
  return { tone: 'yellow', label: days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias` };
}

/**
 * Semáforo do estabelecimento a partir da string de horário:
 * verde aberto · laranja fechando em até 1h · amarelo abre em breve ·
 * vermelho fechado.
 *
 * Retorna null quando o horário não é interpretável (texto livre fora do
 * formato conhecido) — o card omite o selo em vez de chutar.
 */
export function establishmentStatusLight(
  openingHours: string,
  now: Date = new Date(),
): StatusLight | null {
  if (isOpenNow(openingHours, now)) {
    const untilClose = hoursUntilNextClose(openingHours, now);
    if (untilClose !== null && untilClose <= 1) {
      return { tone: 'orange', label: 'Fecha em 1h' };
    }
    return { tone: 'green', label: 'Aberto' };
  }

  const untilOpen = hoursUntilNextOpen(openingHours, now);
  if (untilOpen === null) return null;

  if (untilOpen <= 12) {
    const hours = atLeastOne(untilOpen);
    return { tone: 'yellow', label: `Abre em ${hours}h` };
  }
  return { tone: 'red', label: 'Fechado' };
}

/**
 * Evento sai do feed no dia seguinte ao término: continua visível durante
 * todo o dia em que acabou e some a partir da meia-noite seguinte.
 * Datas inválidas mantêm o evento visível (falha para o lado seguro).
 */
export function isEventVisibleInFeed(endsAt: string, now: Date = new Date()): boolean {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return true;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return end.getTime() >= startOfToday.getTime();
}
