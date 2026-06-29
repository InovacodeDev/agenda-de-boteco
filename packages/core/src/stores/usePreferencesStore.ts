import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isVirtualCityId } from '../utils/geo';

import type { City } from '../schemas';
import { appJsonStorage, registerRehydrator } from '../platform/storage';

export interface PreferencesState {
  cityId: string;
  /**
   * Cidade resolvida por geolocalização que NÃO pertence ao catálogo (cidade
   * virtual, id `geo:`). Guardada inteira porque não existe na lista vinda do
   * backend — é a fonte da cidade quando `cityId` é virtual. null quando o
   * usuário usa uma cidade do catálogo.
   */
  customCity: City | null;
  hasOnboarded: boolean;
  /** true após o persist terminar de reidratar — nunca é persistido */
  hasHydrated: boolean;
  /** Seleciona uma cidade do catálogo pelo id (limpa a cidade virtual). */
  setCity: (cityId: string) => void;
  /** Seleciona uma cidade virtual (fora do catálogo) resolvida por geolocalização. */
  setCustomCity: (city: City) => void;
  completeOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
}

type PreferencesPersistedState = Pick<
  PreferencesState,
  'cityId' | 'customCity' | 'hasOnboarded'
>;

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      cityId: 'fln',
      customCity: null,
      hasOnboarded: false,
      hasHydrated: false,
      setCity: (cityId) =>
        set({ cityId, customCity: isVirtualCityId(cityId) ? undefined : null }),
      setCustomCity: (city) => set({ cityId: city.id, customCity: city }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'preferences',
      storage: appJsonStorage,
      partialize: (state): PreferencesPersistedState => ({
        cityId: state.cityId,
        customCity: state.customCity,
        hasOnboarded: state.hasOnboarded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Recarrega os dados persistidos quando o storage é configurado no bootstrap
// (o store é criado antes, com hidratação automática "vazia").
registerRehydrator(() => {
  void usePreferencesStore.persist.rehydrate();
});
