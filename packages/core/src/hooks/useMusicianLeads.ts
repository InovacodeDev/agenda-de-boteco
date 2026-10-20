import { useInfiniteQuery } from '@tanstack/react-query';

import {
  listMusicianLeads,
  type MusicianLeadCursor,
  type MusicianLeadFilters,
  type MusicianLeadSort,
} from '../services/musician-leads';
import { catalogKeys } from '../services/queryKeys';

export function useMusicianLeads(filters: MusicianLeadFilters, sort: MusicianLeadSort) {
  return useInfiniteQuery({
    queryKey: catalogKeys.musicianLeads.list(filters, sort),
    queryFn: ({ pageParam }) => listMusicianLeads(filters, sort, pageParam),
    initialPageParam: null as MusicianLeadCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
