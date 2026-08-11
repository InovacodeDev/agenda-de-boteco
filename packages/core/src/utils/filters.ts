import type { Establishment, EstablishmentAttribute, Event } from '../schemas';
import { isOpenNow, isWeekend } from './dates';
import { haversineDistanceKm, isVirtualCityId } from './geo';
import { isEventVisibleInFeed } from './status-light';

export type DateBucket = 'any' | 'today' | 'tomorrow' | 'weekend';

export type SortBy = 'date' | 'distance' | 'rating' | 'price';

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
  /** intervalo de datas (ISO yyyy-mm-dd local); null = sem intervalo. Precede dateBucket. */
  dateRange: { start: string; end: string } | null;
  sortBy: SortBy;
  /** cidades selecionadas no filtro (união). Vazio = usa a cidade ativa do contexto. */
  cityIds: string[];
  /**
   * Atributos exigidos do estabelecimento — combinados em **E**: o bar precisa
   * ter todos os marcados. Quem marca "pet friendly" + "área kids" quer levar o
   * cachorro *e* a criança, não um dos dois. Vazio = não filtra.
   */
  attributeIds: EstablishmentAttribute[];
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
  dateRange: null,
  // Proximidade é o default do feed; sem userLocation makeComparator cai para
  // starts_at asc, então a lista nunca fica sem ordem definida.
  sortBy: 'distance',
  cityIds: [],
  attributeIds: [],
};

/**
 * Verdadeiro quando o establishment tem **todos** os atributos exigidos.
 * Lista vazia passa tudo (nenhuma exigência).
 */
export function matchesAttributes(
  establishment: Establishment,
  required: readonly EstablishmentAttribute[],
): boolean {
  if (required.length === 0) return true;
  return required.every((id) => establishment.attributes.includes(id));
}

/**
 * Indica se há algum filtro ativo que **altera o resultado** do feed — usado
 * para a badge no ícone de filtros. Ignora `query` (já visível no campo de
 * busca) e `sortBy` (só reordena, não filtra).
 */
export function hasActiveFilters(filters: EventFilters): boolean {
  return (
    filters.dateBucket !== DEFAULT_EVENT_FILTERS.dateBucket ||
    filters.dateRange !== null ||
    filters.styleIds.length > 0 ||
    filters.cityIds.length > 0 ||
    filters.attributeIds.length > 0 ||
    filters.maxDistanceKm !== DEFAULT_EVENT_FILTERS.maxDistanceKm ||
    filters.minRating !== DEFAULT_EVENT_FILTERS.minRating ||
    filters.maxPrice !== DEFAULT_EVENT_FILTERS.maxPrice ||
    filters.freeOnly ||
    filters.nearMe ||
    filters.openNow
  );
}

export interface EventFilterContext {
  now: Date;
  cityId: string;
  /** Quando presente e não-vazio, o recorte de cidade usa esta união e sobrepõe `cityId`. */
  cityIds?: string[];
  userLocation?: { lat: number; lng: number };
  establishmentsById: Record<string, Establishment>;
  /**
   * Ids dos establishments dentro do raio, vindos do RPC PostGIS
   * (`listNearbyEstablishments`). Quando presente com `nearMe` ativo, a
   * proximidade vira interseção por id sobre dados de servidor — sem recalcular
   * distância no cliente.
   */
  nearbyEstablishmentIds?: ReadonlySet<string>;
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

function isWithinDateRange(
  iso: string,
  range: { start: string; end: string },
): boolean {
  const day = new Date(iso);
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T23:59:59.999`);
  return day >= start && day <= end;
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
 * a entrada e retorna nova lista ordenada conforme `filters.sortBy`
 * (desempate sempre por starts_at ascendente).
 *
 * Regras:
 * - Sempre restringe à cidade do contexto (via establishment do evento);
 *   eventos sem establishment conhecido são descartados.
 * - `nearMe` com `ctx.nearbyEstablishmentIds` presente: interseção por id sobre
 *   o resultado do RPC PostGIS (fronteira de proximidade server-side).
 * - `nearMe` sem `nearbyEstablishmentIds`: fallback Haversine sobre os dados já
 *   em memória; só atua quando ctx.userLocation existe — sem localização do
 *   usuário é no-op (não dá para medir distância).
 */
export function applyEventFilters(
  events: Event[],
  filters: EventFilters,
  ctx: EventFilterContext,
): Event[] {
  const query = normalizeText(filters.query.trim());

  // Cidade virtual (geolocalização fora do catálogo): não há establishments
  // cadastrados nela, então o recorte por cidade é ignorado e a seleção passa
  // a depender da proximidade (nearMe). Cidades do catálogo seguem recortadas.
  const isVirtualCity = isVirtualCityId(ctx.cityId);

  // Multi-select do filtro sobrepõe a cidade ativa quando presente e não-vazio.
  // Precede inclusive o bypass de cidade virtual: multi-select é sempre recorte
  // estrito de catálogo (um id `geo:` nunca casa com establishment.city_id).
  const cityIds = ctx.cityIds && ctx.cityIds.length > 0 ? ctx.cityIds : null;

  return events
    .filter((event) => {
      // Evento encerrado sai do feed a partir do dia seguinte ao término.
      if (!isEventVisibleInFeed(event.ends_at, ctx.now)) return false;

      const establishment = ctx.establishmentsById[event.establishment_id];
      if (!establishment) return false;
      if (cityIds) {
        if (!cityIds.includes(establishment.city_id)) return false;
      } else if (!isVirtualCity && establishment.city_id !== ctx.cityId) {
        return false;
      }

      if (!matchesAttributes(establishment, filters.attributeIds)) return false;

      if (query) {
        const haystacks = [event.name, event.attraction, establishment.name];
        if (!haystacks.some((value) => normalizeText(value).includes(query))) {
          return false;
        }
      }

      if (filters.dateRange) {
        if (!isWithinDateRange(event.starts_at, filters.dateRange)) return false;
      } else if (!matchesDateBucket(event, filters.dateBucket, ctx.now)) {
        return false;
      }

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

      if (filters.nearMe) {
        if (ctx.nearbyEstablishmentIds) {
          // Proximidade server-side: interseção por id com o resultado do RPC.
          if (!ctx.nearbyEstablishmentIds.has(event.establishment_id)) {
            return false;
          }
        } else if (ctx.userLocation) {
          // Fallback Haversine sobre dados já carregados.
          const distanceKm = haversineDistanceKm(ctx.userLocation, {
            lat: establishment.lat,
            lng: establishment.lng,
          });
          if (distanceKm > filters.maxDistanceKm) return false;
        }
      }

      if (filters.openNow && !isOpenNow(establishment.opening_hours, ctx.now)) {
        return false;
      }

      return true;
    })
    .sort(makeComparator(filters, ctx));
}

function startsAtAsc(a: Event, b: Event): number {
  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
}

function makeComparator(
  filters: EventFilters,
  ctx: EventFilterContext,
): (a: Event, b: Event) => number {
  // Captura userLocation antes do closure: canDistance garante que é definido
  // quando true, e origin elimina a necessidade de checagens adicionais dentro.
  const origin = ctx.userLocation;
  const canDistance = filters.sortBy === 'distance' && !!origin;
  return (a, b) => {
    let primary = 0;
    if (filters.sortBy === 'rating') {
      const ra = ctx.establishmentsById[a.establishment_id]?.rating_avg ?? 0;
      const rb = ctx.establishmentsById[b.establishment_id]?.rating_avg ?? 0;
      primary = rb - ra;
    } else if (filters.sortBy === 'price') {
      primary = a.cover_charge - b.cover_charge;
    } else if (canDistance) {
      const ea = ctx.establishmentsById[a.establishment_id];
      const eb = ctx.establishmentsById[b.establishment_id];
      const da = ea ? haversineDistanceKm(origin, { lat: ea.lat, lng: ea.lng }) : Infinity;
      const db = eb ? haversineDistanceKm(origin, { lat: eb.lat, lng: eb.lng }) : Infinity;
      primary = da - db;
    }
    return primary !== 0 ? primary : startsAtAsc(a, b);
  };
}

/**
 * Ordenação da aba "Bares".
 * - `eventToday`: quem tem evento hoje primeiro (default do feed)
 * - `eventWeek`: quem tem evento nos próximos 7 dias primeiro
 * - `distance`: só proximidade
 */
export type EstablishmentSortBy = 'eventToday' | 'eventWeek' | 'distance';

export const DEFAULT_ESTABLISHMENT_SORT: EstablishmentSortBy = 'eventToday';

/** Opções do seletor de ordenação da aba Bares, na ordem de exibição. */
export const ESTABLISHMENT_SORT_OPTIONS = [
  'eventToday',
  'eventWeek',
  'distance',
] as const satisfies readonly EstablishmentSortBy[];

export const ESTABLISHMENT_SORT_LABELS: Record<EstablishmentSortBy, string> = {
  eventToday: 'Evento hoje',
  eventWeek: 'Na semana',
  distance: 'Mais perto',
};

export interface EstablishmentFilterParams {
  /** Busca por nome (normalizada: sem acento, case-insensitive). */
  query?: string;
  /** Cidade ativa; ids virtuais (`geo:`) não recortam — não há bar cadastrado nelas. */
  cityId?: string;
  /** Cidades do multi-select. Quando não-vazio, sobrepõe `cityId`. */
  cityIds?: readonly string[];
  /** Atributos exigidos, combinados em E. */
  attributeIds?: readonly EstablishmentAttribute[];
  /** Presente = ordena por proximidade; ausente = mantém a ordem recebida. */
  origin?: { lat: number; lng: number } | null;
  /** Critério de ordenação; default `eventToday`. */
  sortBy?: EstablishmentSortBy;
  /**
   * Eventos do catálogo, para as ordenações por agenda. Ausente ou vazio faz
   * `eventToday`/`eventWeek` degradarem para proximidade — sem agenda não há
   * como separar quem tem evento de quem não tem.
   */
  events?: readonly Event[];
  /** Base temporal das ordenações por agenda; default `new Date()`. */
  now?: Date;
}

const DAY_MS = 86_400_000;

/**
 * Ids dos establishments com pelo menos um evento visível dentro da janela de
 * `days` dias a partir de hoje (00h local). Eventos já encerrados não contam —
 * mesmo critério que os tira do feed.
 */
function establishmentIdsWithEventWithin(
  events: readonly Event[],
  days: number,
  now: Date,
): Set<string> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const limit = startOfToday.getTime() + days * DAY_MS;

  const ids = new Set<string>();
  for (const event of events) {
    if (!isEventVisibleInFeed(event.ends_at, now)) continue;
    const startsAt = new Date(event.starts_at).getTime();
    if (Number.isNaN(startsAt) || startsAt >= limit) continue;
    ids.add(event.establishment_id);
  }
  return ids;
}

/**
 * Filtra e ordena a lista de bares (aba "Bares" do feed). Função pura.
 *
 * Espelha o recorte de cidade de `applyEventFilters` — multi-select sobrepõe a
 * cidade ativa, e cidade virtual (geolocalização fora do catálogo) não recorta,
 * senão a aba ficaria vazia para quem está fora das cidades cadastradas.
 */
export function applyEstablishmentFilters(
  establishments: Establishment[],
  params: EstablishmentFilterParams,
): Establishment[] {
  const query = normalizeText((params.query ?? '').trim());
  const cityIds =
    params.cityIds && params.cityIds.length > 0 ? params.cityIds : null;
  const attributeIds = params.attributeIds ?? [];

  const filtered = establishments.filter((establishment) => {
    if (cityIds) {
      if (!cityIds.includes(establishment.city_id)) return false;
    } else if (params.cityId && !isVirtualCityId(params.cityId)) {
      if (establishment.city_id !== params.cityId) return false;
    }

    if (!matchesAttributes(establishment, attributeIds)) return false;

    if (query && !normalizeText(establishment.name).includes(query)) return false;

    return true;
  });

  const byDistance = sortEstablishmentsByDistance(filtered, params.origin);

  const sortBy = params.sortBy ?? DEFAULT_ESTABLISHMENT_SORT;
  if (sortBy === 'distance') return byDistance;

  const events = params.events ?? [];
  if (events.length === 0) return byDistance;

  // Parte a lista em dois grupos preservando a ordem por proximidade dentro de
  // cada um — sort estável faria o mesmo, mas o particionamento deixa a regra
  // explícita: agenda decide o grupo, distância decide a posição.
  const withEvent = establishmentIdsWithEventWithin(
    events,
    sortBy === 'eventToday' ? 1 : 7,
    params.now ?? new Date(),
  );
  const featured: Establishment[] = [];
  const rest: Establishment[] = [];
  for (const establishment of byDistance) {
    (withEvent.has(establishment.id) ? featured : rest).push(establishment);
  }
  return [...featured, ...rest];
}

/**
 * Ordena establishments pelos mais próximos de `origin`. Função pura: não muta
 * a entrada. Sem `origin` devolve uma cópia na ordem recebida — a lista do feed
 * é a mesma com ou sem permissão de GPS, só reordenada.
 *
 * Desempate por nome (localeCompare pt-BR) para a ordem ser estável entre
 * renders quando dois bares estão à mesma distância.
 */
export function sortEstablishmentsByDistance(
  establishments: Establishment[],
  origin: { lat: number; lng: number } | null | undefined,
): Establishment[] {
  if (!origin) return [...establishments];
  return [...establishments].sort((a, b) => {
    const da = haversineDistanceKm(origin, { lat: a.lat, lng: a.lng });
    const db = haversineDistanceKm(origin, { lat: b.lat, lng: b.lng });
    return da !== db ? da - db : a.name.localeCompare(b.name, 'pt-BR');
  });
}
