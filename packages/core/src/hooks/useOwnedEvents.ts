import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { listOwnedEvents } from '../services/catalog';
import { deleteOwnedEvent, deleteOwnedEventGroup } from '../services/owned-events';
import { catalogKeys } from '../services/queryKeys';
import { useOwnedEstablishmentId } from './useOwnedEstablishment';

export function useOwnedEvents() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useInfiniteQuery({
    queryKey: catalogKeys.events.owned(establishmentId ?? ''),
    queryFn: ({ pageParam }) => listOwnedEvents(establishmentId ?? '', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(establishmentId),
  });
}

/** As telas capturam o erro do `mutateAsync` e o exibem; o handler global não deve repetir. */
const HANDLED_LOCALLY = { handledLocally: true } as const;

function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: catalogKeys.events.root });
}

export function useDeleteOwnedEvent() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (eventId: string) => deleteOwnedEvent(eventId),
    onSuccess: invalidate,
    meta: HANDLED_LOCALLY,
  });
}

export function useDeleteOwnedEventGroup() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (recurrenceGroupId: string) => deleteOwnedEventGroup(recurrenceGroupId),
    onSuccess: invalidate,
    meta: HANDLED_LOCALLY,
  });
}
