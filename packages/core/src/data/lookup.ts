import type { City, Event, MusicStyle } from '../schemas';

/** Índice O(1) por id — substitui `.find` repetido nas telas e listas. */
export function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

/**
 * Ids de bar referenciados pelos eventos que ainda não estão em `knownById`.
 * O feed pagina eventos e bares em listas independentes: um evento cujo bar está
 * numa página não carregada seria descartado por `applyEventFilters`; estes ids
 * alimentam o lookup direto desses bares. Sem repetição, na ordem de aparição.
 */
export function findMissingEstablishmentIds(
  events: readonly Pick<Event, 'establishment_id'>[],
  knownById: Readonly<Record<string, unknown>>,
): string[] {
  const missing = new Set<string>();
  for (const event of events) {
    if (!Object.hasOwn(knownById, event.establishment_id)) {
      missing.add(event.establishment_id);
    }
  }
  return [...missing];
}

/**
 * Resolve a cidade ativa a partir do estado de preferências. Quando `cityId`
 * aponta para uma cidade do catálogo, retorna-a (ou a primeira como fallback).
 * Quando aponta para uma cidade virtual (`geo:`, fora do catálogo), retorna a
 * `customCity` guardada no store — que carrega as coords reais do usuário.
 * Sem catálogo e sem cidade virtual correspondente, retorna `undefined`.
 */
export function resolveActiveCity(
  cities: City[],
  cityId: string,
  customCity: City | null,
): City | undefined {
  if (customCity && customCity.id === cityId) {
    return customCity;
  }
  return cities.find((city) => city.id === cityId) ?? cities[0];
}

// Cache por referência de evento: arrays estáveis permitem que cards memoizados
// (React.memo) não re-renderizem quando o evento não mudou. O structural sharing
// do TanStack Query preserva a referência de cada Event entre refetches, então
// a entrada do WeakMap continua válida e a memoização dos cards é mantida.
const stylesByEvent = new WeakMap<Event, MusicStyle[]>();

/** Estilos musicais de um evento, ignorando ids desconhecidos. */
export function musicStylesForEvent(
  event: Event,
  stylesById: Record<string, MusicStyle>,
): MusicStyle[] {
  const cached = stylesByEvent.get(event);
  if (cached) {
    return cached;
  }
  const styles = event.music_style_ids
    .map((id) => stylesById[id])
    .filter((style) => style !== undefined);
  stylesByEvent.set(event, styles);
  return styles;
}
