import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appJsonStorage } from './storage';

export interface FavoritesState {
  eventIds: string[];
  establishmentIds: string[];
  toggleEvent: (id: string) => void;
  toggleEstablishment: (id: string) => void;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      eventIds: [],
      establishmentIds: [],
      toggleEvent: (id) =>
        set((state) => ({ eventIds: toggleId(state.eventIds, id) })),
      toggleEstablishment: (id) =>
        set((state) => ({ establishmentIds: toggleId(state.establishmentIds, id) })),
    }),
    {
      name: 'favorites',
      storage: appJsonStorage,
    },
  ),
);

/** Selector puro: o evento está favoritado? */
export function isEventFavorite(state: FavoritesState, id: string): boolean {
  return state.eventIds.includes(id);
}

/** Selector puro: o estabelecimento está favoritado? */
export function isEstablishmentFavorite(state: FavoritesState, id: string): boolean {
  return state.establishmentIds.includes(id);
}
