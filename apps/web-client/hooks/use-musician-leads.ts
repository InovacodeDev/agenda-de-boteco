'use client';

import {
  catalogKeys,
  listMusicianLeads,
  type MusicianLeadCursor,
  type MusicianLeadFilters,
  type MusicianLeadSort,
} from '@agenda/core';
import { useInfiniteQuery } from '@tanstack/react-query';

/** Leads de músico paginados por cursor — ver list_musician_leads (Task 1/2). */
export function useMusicianLeads(filters: MusicianLeadFilters, sort: MusicianLeadSort) {
  return useInfiniteQuery({
    queryKey: catalogKeys.musicianLeads.list(filters, sort),
    queryFn: ({ pageParam }) => listMusicianLeads(filters, sort, pageParam),
    initialPageParam: null as MusicianLeadCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
