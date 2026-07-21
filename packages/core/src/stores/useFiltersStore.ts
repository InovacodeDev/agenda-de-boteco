import { create } from 'zustand';

import {
  type DateBucket,
  DEFAULT_EVENT_FILTERS,
  type EventFilters,
  type SortBy,
} from '../utils/filters';

export interface FiltersState {
  filters: EventFilters;
  setQuery: (query: string) => void;
  setDateBucket: (dateBucket: DateBucket) => void;
  setDateRange: (range: { start: string; end: string } | null) => void;
  setSortBy: (sortBy: SortBy) => void;
  toggleStyle: (id: string) => void;
  setMaxDistanceKm: (km: number) => void;
  setMinRating: (rating: number) => void;
  setMaxPrice: (price: number | null) => void;
  toggleFreeOnly: () => void;
  toggleNearMe: () => void;
  setOpenNow: (value: boolean) => void;
  toggleCity: (id: string) => void;
  setCityIds: (ids: string[]) => void;
  resetFilters: () => void;
  replaceFilters: (filters: EventFilters) => void;
}

export const useFiltersStore = create<FiltersState>()((set) => {
  const patchFilters = (partial: Partial<EventFilters>): void =>
    set((state) => ({ filters: { ...state.filters, ...partial } }));

  return {
    filters: DEFAULT_EVENT_FILTERS,
    setQuery: (query) => patchFilters({ query }),
    setDateBucket: (dateBucket) => patchFilters({ dateBucket, dateRange: null }),
    setDateRange: (dateRange) => patchFilters({ dateRange, dateBucket: 'any' }),
    setSortBy: (sortBy) => patchFilters({ sortBy }),
    toggleStyle: (id) =>
      set((state) => ({
        filters: {
          ...state.filters,
          styleIds: state.filters.styleIds.includes(id)
            ? state.filters.styleIds.filter((styleId) => styleId !== id)
            : [...state.filters.styleIds, id],
        },
      })),
    setMaxDistanceKm: (km) => patchFilters({ maxDistanceKm: km }),
    setMinRating: (rating) => patchFilters({ minRating: rating }),
    setMaxPrice: (price) => patchFilters({ maxPrice: price }),
    toggleFreeOnly: () =>
      set((state) => ({
        filters: { ...state.filters, freeOnly: !state.filters.freeOnly },
      })),
    toggleNearMe: () =>
      set((state) => ({
        filters: { ...state.filters, nearMe: !state.filters.nearMe },
      })),
    setOpenNow: (value) => patchFilters({ openNow: value }),
    toggleCity: (id) =>
      set((state) => ({
        filters: {
          ...state.filters,
          cityIds: state.filters.cityIds.includes(id)
            ? state.filters.cityIds.filter((cityId) => cityId !== id)
            : [...state.filters.cityIds, id],
        },
      })),
    setCityIds: (cityIds) => patchFilters({ cityIds }),
    resetFilters: () => set({ filters: DEFAULT_EVENT_FILTERS }),
    replaceFilters: (filters) => set({ filters }),
  };
});
