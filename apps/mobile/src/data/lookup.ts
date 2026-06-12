import { CITIES, ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from './mock';
import type { City, Event, MusicStyle } from './schemas';

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

/** Índices O(1) do catálogo — substituem `.find` repetido nas telas e listas. */
export const CITIES_BY_ID = indexById(CITIES);
export const ESTABLISHMENTS_BY_ID = indexById(ESTABLISHMENTS);
export const EVENTS_BY_ID = indexById(EVENTS);
export const MUSIC_STYLES_BY_ID = indexById(MUSIC_STYLES);

/** Cidade selecionada com fallback para a primeira do catálogo. */
export function cityByIdOrDefault(id: string): City {
  return CITIES_BY_ID[id] ?? CITIES[0];
}

// Cache por referência: arrays estáveis permitem que cards memoizados
// (React.memo) não re-renderizem quando o evento não mudou.
const stylesByEvent = new WeakMap<Event, MusicStyle[]>();

/** Estilos musicais de um evento, ignorando ids desconhecidos. */
export function musicStylesForEvent(event: Event): MusicStyle[] {
  const cached = stylesByEvent.get(event);
  if (cached) {
    return cached;
  }
  const styles = event.music_style_ids
    .map((id) => MUSIC_STYLES_BY_ID[id])
    .filter((style) => style !== undefined);
  stylesByEvent.set(event, styles);
  return styles;
}
