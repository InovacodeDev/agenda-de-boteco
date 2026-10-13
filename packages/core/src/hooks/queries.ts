/**
 * Hooks finos de leitura sobre o service @/services/catalog. Cada hook envolve
 * uma das funções públicas do service com sua query key da factory. Sem lógica
 * própria além de wiring key + queryFn (+ enabled em queries dependentes de id).
 * As listagens paginadas usam useInfiniteQuery: pageParam é o cursor opaco de
 * CatalogPage, e getNextPageParam lê nextCursor direto (null encerra a lista).
 * useCatalogCountsQuery é a exceção: agregado único, useQuery normal.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as catalog from '../services/catalog';
import { catalogKeys } from '../services/queryKeys';
import { uniqueSortedIds } from '../utils/ids';

export function useEventsQuery(dateRange: { start: string; end: string } | null = null) {
  return useInfiniteQuery({
    queryKey: dateRange
      ? catalogKeys.events.listInRange(dateRange.start, dateRange.end)
      : catalogKeys.events.list,
    queryFn: ({ pageParam }) => catalog.listEvents(pageParam, undefined, dateRange),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useEventQuery(id: string) {
  return useQuery({
    queryKey: catalogKeys.events.detail(id),
    queryFn: () => catalog.getEvent(id),
    enabled: !!id,
  });
}

/**
 * `query` é a busca por nome feita no servidor: sem ela só as páginas já
 * carregadas seriam pesquisadas. Quem chama deve debouncar o texto digitado.
 * Durante a busca, o resultado anterior fica na tela até o novo chegar.
 */
export function useEstablishmentsQuery(cityId?: string, query?: string) {
  const search = query?.trim() ?? '';
  return useInfiniteQuery({
    queryKey: search
      ? catalogKeys.establishments.search(cityId, search)
      : catalogKeys.establishments.list(cityId),
    queryFn: ({ pageParam }) =>
      catalog.listEstablishments(cityId, pageParam, undefined, search || undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: search ? keepPreviousData : undefined,
  });
}

/**
 * Bares por id, fora da paginação do feed. Consumidores que exibem a lista
 * devem filtrar pelos ids atuais: o placeholder mantém o resultado anterior
 * (mesma lógica de keepPreviousData) enquanto a nova seleção carrega.
 */
export function useEstablishmentsByIds(ids: readonly string[]) {
  const sortedIds = uniqueSortedIds(ids);
  return useQuery({
    queryKey: catalogKeys.establishments.byIds(sortedIds),
    queryFn: () => catalog.listEstablishmentsByIds(sortedIds),
    enabled: sortedIds.length > 0,
    placeholderData: sortedIds.length > 0 ? keepPreviousData : undefined,
  });
}

/** Eventos por id (favoritos), fora da paginação do feed. */
export function useEventsByIds(ids: readonly string[]) {
  const sortedIds = uniqueSortedIds(ids);
  return useQuery({
    queryKey: catalogKeys.events.byIds(sortedIds),
    queryFn: () => catalog.listEventsByIds(sortedIds),
    enabled: sortedIds.length > 0,
    placeholderData: sortedIds.length > 0 ? keepPreviousData : undefined,
  });
}

export function useEstablishmentQuery(id: string) {
  return useQuery({
    queryKey: catalogKeys.establishments.detail(id),
    queryFn: () => catalog.getEstablishment(id),
    enabled: !!id,
  });
}

export function useEventsByEstablishmentQuery(establishmentId: string) {
  return useInfiniteQuery({
    queryKey: catalogKeys.events.byEstablishment(establishmentId),
    queryFn: ({ pageParam }) => catalog.listEventsByEstablishment(establishmentId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!establishmentId,
  });
}

export function useMusicStylesQuery() {
  return useQuery({
    queryKey: catalogKeys.musicStyles,
    queryFn: () => catalog.listMusicStyles(),
  });
}

export function useCitiesQuery() {
  return useQuery({
    queryKey: catalogKeys.cities,
    queryFn: () => catalog.listCities(),
  });
}

export function useNotificationsQuery() {
  return useInfiniteQuery({
    queryKey: catalogKeys.notifications,
    queryFn: ({ pageParam }) => catalog.listNotifications(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useEventAttractionsQuery(eventId: string) {
  return useQuery({
    queryKey: catalogKeys.events.attractions(eventId),
    queryFn: () => catalog.listEventAttractions(eventId),
    enabled: !!eventId,
  });
}

/** Totais do catálogo (dashboard admin) — agregado único, não paginado. */
export function useCatalogCountsQuery() {
  return useQuery({
    queryKey: catalogKeys.counts,
    queryFn: () => catalog.getCatalogCounts(),
  });
}
