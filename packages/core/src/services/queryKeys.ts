import type { MusicianLeadFilters, MusicianLeadSort } from './musician-leads';

/**
 * Factory hierárquica de query keys do catálogo. A hierarquia importa para
 * invalidação por prefixo: `['events']` deve casar com `['events','detail',id]`
 * e `['events','by-establishment',id]` (a Etapa 7 invalida via realtime usando
 * esses prefixos). Use sempre estas factories — nunca arrays literais soltos.
 */
export const catalogKeys = {
  events: {
    root: ['events'] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    byEstablishment: (establishmentId: string) =>
      ['events', 'by-establishment', establishmentId] as const,
    attractions: (eventId: string) =>
      ['events', 'attractions', eventId] as const,
    // Agenda do painel do dono (inclui rascunho). Começa com 'events' para que
    // a invalidação por prefixo após salvar/apagar evento também a alcance.
    owned: (establishmentId: string) =>
      ['events', 'owned', establishmentId] as const,
  },
  establishments: {
    root: ['establishments'] as const,
    list: (cityId?: string) =>
      cityId
        ? (['establishments', 'list', cityId] as const)
        : (['establishments', 'list'] as const),
    detail: (id: string) => ['establishments', 'detail', id] as const,
    // Começa com 'establishments' de propósito: a invalidação por prefixo da
    // Etapa 7 (realtime sobre 'establishments') também cobre as queries nearby.
    // lat/lng devem chegar já arredondados (coarseLatLng) para estabilizar a key.
    nearby: (lat: number, lng: number, radiusKm?: number) =>
      radiusKm === undefined
        ? (['establishments', 'nearby', lat, lng] as const)
        : (['establishments', 'nearby', lat, lng, radiusKm] as const),
  },
  musicStyles: ['music-styles'] as const,
  cities: ['cities'] as const,
  notifications: ['notifications'] as const,
  musicianLeads: {
    root: ['musician-leads'] as const,
    list: (filters: MusicianLeadFilters, sort: MusicianLeadSort) =>
      ['musician-leads', 'list', filters, sort] as const,
  },
} as const;
