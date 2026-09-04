/**
 * Hooks finos de leitura sobre o service @/services/catalog. Cada hook envolve
 * uma das 8 funções públicas do service com sua query key da factory. Sem lógica
 * própria além de wiring key + queryFn (+ enabled em queries dependentes de id).
 * As listagens paginadas usam useInfiniteQuery: pageParam é o cursor opaco de
 * CatalogPage, e getNextPageParam lê nextCursor direto (null encerra a lista).
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import * as catalog from '../services/catalog';
import { catalogKeys } from '../services/queryKeys';

export function useEventsQuery() {
  return useInfiniteQuery({
    queryKey: catalogKeys.events.list,
    queryFn: ({ pageParam }) => catalog.listEvents(pageParam),
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

export function useEstablishmentsQuery(cityId?: string) {
  return useInfiniteQuery({
    queryKey: catalogKeys.establishments.list(cityId),
    queryFn: ({ pageParam }) => catalog.listEstablishments(cityId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
