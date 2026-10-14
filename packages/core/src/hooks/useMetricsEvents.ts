import { useInfiniteQuery } from '@tanstack/react-query';

import type { Event } from '../schemas/catalog';
import { listEventsByIds } from '../services/catalog';
import { catalogKeys } from '../services/queryKeys';
import { type CatalogPage, DEFAULT_PAGE_SIZE } from '../utils/pagination';

/**
 * Nome/dados dos eventos da tela de métricas, em páginas de DEFAULT_PAGE_SIZE.
 * Os totais por evento vêm agregados do banco e cobrem todos os eventos; a
 * agenda paginada (useOwnedEvents) só traz a 1ª página, então aqui a busca é por
 * id, na ordem de `eventIds` (views desc). Paginação por offset sobre a lista
 * de ids é segura: a lista é um snapshot e faz parte da query key. O cursor é o
 * offset em texto, para a página seguir o contrato CatalogPage (flattenPages).
 *
 * Sem filtro de status: a RLS (select_events) deixa o dono ler os próprios
 * rascunhos. Evento apagado leva as métricas junto (ON DELETE CASCADE), então
 * id sem evento só ocorre em corrida; a linha é omitida.
 *
 * Sempre habilitada, mesmo com lista vazia: query desabilitada sem dado fica
 * `isPending` para sempre. Lista vazia não consulta o servidor.
 * staleTime 0: o nome do evento pode mudar na agenda e esta key não é alcançada
 * pela invalidação de `events`.
 */
export function useMetricsEvents(eventIds: readonly string[]) {
  return useInfiniteQuery({
    queryKey: catalogKeys.panel.metricsEvents(eventIds),
    queryFn: async ({ pageParam }): Promise<CatalogPage<Event>> => {
      const offset = Number(pageParam);
      const pageIds = eventIds.slice(offset, offset + DEFAULT_PAGE_SIZE);
      const events = await listEventsByIds(pageIds);
      const eventsById = new Map(events.map((event) => [event.id, event]));
      const nextOffset = offset + DEFAULT_PAGE_SIZE;
      return {
        items: pageIds.flatMap((id) => eventsById.get(id) ?? []),
        nextCursor: nextOffset < eventIds.length ? String(nextOffset) : null,
      };
    },
    initialPageParam: '0',
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
  });
}
