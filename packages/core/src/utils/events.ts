import type { Event } from '../schemas';

/**
 * Eventos futuros (starts_at >= now) de um estabelecimento, ordenados do mais
 * próximo ao mais distante, limitados a `limit`. Função pura: não muta a entrada.
 */
export function upcomingEventsForEstablishment(
  events: Event[],
  establishmentId: string,
  now: Date,
  limit: number,
): Event[] {
  const nowMs = now.getTime();
  return events
    .map((event) => ({ event, ms: new Date(event.starts_at).getTime() }))
    .filter(({ event, ms }) => event.establishment_id === establishmentId && ms >= nowMs)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, limit)
    .map(({ event }) => event);
}
