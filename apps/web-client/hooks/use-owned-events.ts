'use client';

import {
  catalogKeys,
  deleteOwnedEvent,
  deleteOwnedEventGroup,
  listOwnedEvents,
} from '@agenda/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useOwnedEstablishmentId } from './use-owned-establishment';

/**
 * Agenda completa do bar do dono, rascunhos incluídos. Só dispara depois de
 * haver vínculo — sem id a query ficaria pendurada num `''`.
 *
 * Sem `signal`: listOwnedEvents(establishmentId) não recebe AbortSignal (o
 * supabase-js do core não expõe cancelamento nessa camada).
 */
export function useOwnedEvents() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: catalogKeys.events.owned(establishmentId ?? ''),
    queryFn: () => listOwnedEvents(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
  });
}

/**
 * Invalida por prefixo `['events']`: uma exclusão mexe na agenda do painel, no
 * detalhe do evento e na lista pública do bar. Invalidar a raiz alcança as três
 * de uma vez, sem enumerar keys que ainda podem nascer.
 */
function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: catalogKeys.events.root });
}

export function useDeleteOwnedEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (eventId: string) => deleteOwnedEvent(eventId),
    onSuccess: invalidate,
  });
}

/** Apaga a série de recorrência a partir de hoje (ver deleteOwnedEventGroup). */
export function useDeleteOwnedEventGroup() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (recurrenceGroupId: string) => deleteOwnedEventGroup(recurrenceGroupId),
    onSuccess: invalidate,
  });
}
