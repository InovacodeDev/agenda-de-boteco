import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appJsonStorage } from './storage';

export interface PreferencesState {
  cityId: string;
  hasOnboarded: boolean;
  /** true após o persist terminar de reidratar — nunca é persistido */
  hasHydrated: boolean;
  setCity: (cityId: string) => void;
  completeOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
}

type PreferencesPersistedState = Pick<PreferencesState, 'cityId' | 'hasOnboarded'>;

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      cityId: 'fln',
      hasOnboarded: false,
      hasHydrated: false,
      setCity: (cityId) => set({ cityId }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'preferences',
      storage: appJsonStorage,
      partialize: (state): PreferencesPersistedState => ({
        cityId: state.cityId,
        hasOnboarded: state.hasOnboarded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
