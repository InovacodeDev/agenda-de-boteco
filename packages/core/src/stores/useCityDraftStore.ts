import { create } from 'zustand';

export interface CityDraftState {
  draftCityIds: string[];
  setDraftCityIds: (ids: string[]) => void;
  toggleDraftCity: (id: string) => void;
}

/**
 * Rascunho efêmero da seleção de cidades do filtro do feed. Serve de ponte
 * entre a tela de filtros e a rota de busca de cidade (mobile), que vivem em
 * rotas separadas. Não é persistido — o commit definitivo é o `cityIds` do
 * `useFiltersStore` ao aplicar os filtros.
 */
export const useCityDraftStore = create<CityDraftState>()((set) => ({
  draftCityIds: [],
  setDraftCityIds: (ids) => set({ draftCityIds: ids }),
  toggleDraftCity: (id) =>
    set((state) => ({
      draftCityIds: state.draftCityIds.includes(id)
        ? state.draftCityIds.filter((cityId) => cityId !== id)
        : [...state.draftCityIds, id],
    })),
}));
