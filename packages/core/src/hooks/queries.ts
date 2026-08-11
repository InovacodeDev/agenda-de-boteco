/**
 * Hooks finos de leitura sobre o service @/services/catalog. Cada hook envolve
 * uma das 8 funções públicas do service com sua query key da factory. Sem lógica
 * própria além de wiring key + queryFn (+ enabled em queries dependentes de id).
 */
import { useQuery } from '@tanstack/react-query';

import * as catalog from '../services/catalog';
import { catalogKeys } from '../services/queryKeys';

export function useEventsQuery() {
  return useQuery({
    queryKey: catalogKeys.events.root,
    queryFn: () => catalog.listEvents(),
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
  return useQuery({
    queryKey: catalogKeys.establishments.list(cityId),
    queryFn: () => catalog.listEstablishments(cityId),
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
  return useQuery({
    queryKey: catalogKeys.events.byEstablishment(establishmentId),
    queryFn: () => catalog.listEventsByEstablishment(establishmentId),
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
  return useQuery({
    queryKey: catalogKeys.notifications,
    queryFn: () => catalog.listNotifications(),
  });
}

export function useEventAttractionsQuery(eventId: string) {
  return useQuery({
    queryKey: catalogKeys.events.attractions(eventId),
    queryFn: () => catalog.listEventAttractions(eventId),
    enabled: !!eventId,
  });
}
