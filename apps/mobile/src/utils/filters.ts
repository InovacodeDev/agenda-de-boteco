import type { Establishment, Event } from '../data/schemas';
import { isOpenNow, isWeekend } from './dates';
import { haversineDistanceKm } from './geo';

export type DateBucket = 'any' | 'today' | 'tomorrow' | 'weekend';

export interface EventFilters {
  query: string;
  dateBucket: DateBucket;
  styleIds: string[];
  maxDistanceKm: number;
  minRating: number;
  /** null = sem limite de preço */
  maxPrice: number | null;
  freeOnly: boolean;
  nearMe: boolean;
  openNow: boolean;
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  query: '',
  dateBucket: 'any',
  styleIds: [],
  maxDistanceKm: 50,
  minRating: 0,
  maxPrice: null,
  freeOnly: false,
  nearMe: false,
  openNow: false,
};

export interface EventFilterContext {
  now: Date;
  cityId: string;
  userLocation?: { lat: number; lng: number };
  establishmentsById: Record<string, Establishment>;
}

/** Normaliza para busca: lowercase + remoção de acentos (decomposição NFD). */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isSameLocalDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function matchesDateBucket(event: Event, bucket: DateBucket, now: Date): boolean {
  if (bucket === 'any') return true;
  if (bucket === 'today') return isSameLocalDay(event.starts_at, now);
  if (bucket === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameLocalDay(event.starts_at, tomorrow);
  }
  return isWeekend(event.starts_at);
}

/**
 * Aplica os filtros do feed sobre a lista de eventos. Função pura: não muta
 * a entrada e retorna nova lista ordenada por starts_at ascendente.
 *
 * Regras:
 * - Sempre restringe à cidade do contexto (via establishment do evento);
 *   eventos sem establishment conhecido são descartados.
 * - `nearMe` só atua quando ctx.userLocation existe — sem localização do
 *   usuário é no-op (não dá para medir distância).
 */
export function applyEventFilters(
  events: Event[],
  filters: EventFilters,
  ctx: EventFilterContext,
): Event[] {
  const query = normalizeText(filters.query.trim());

  return events
    .filter((event) => {
      const establishment = ctx.establishmentsById[event.establishment_id];
      if (!establishment || establishment.city_id !== ctx.cityId) return false;

      if (query) {
        const haystacks = [event.name, event.attraction, establishment.name];
        if (!haystacks.some((value) => normalizeText(value).includes(query))) {
          return false;
        }
      }

      if (!matchesDateBucket(event, filters.dateBucket, ctx.now)) return false;

      if (
        filters.styleIds.length > 0 &&
        !event.music_style_ids.some((id) => filters.styleIds.includes(id))
      ) {
        return false;
      }

      if (establishment.rating_avg < filters.minRating) return false;
      if (filters.maxPrice !== null && event.cover_charge > filters.maxPrice) {
        return false;
      }
      if (filters.freeOnly && event.cover_charge !== 0) return false;

      if (filters.nearMe && ctx.userLocation) {
        const distanceKm = haversineDistanceKm(ctx.userLocation, {
          lat: establishment.lat,
          lng: establishment.lng,
        });
        if (distanceKm > filters.maxDistanceKm) return false;
      }

      if (filters.openNow && !isOpenNow(establishment.opening_hours, ctx.now)) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}
