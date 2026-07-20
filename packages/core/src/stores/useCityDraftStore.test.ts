import { useCityDraftStore } from './useCityDraftStore';

describe('useCityDraftStore', () => {
  beforeEach(() => {
    useCityDraftStore.getState().setDraftCityIds([]);
  });

  it('setDraftCityIds substitui a lista', () => {
    useCityDraftStore.getState().setDraftCityIds(['fln', 'sao']);
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln', 'sao']);
  });

  it('toggleDraftCity adiciona quando ausente e remove quando presente', () => {
    const { toggleDraftCity } = useCityDraftStore.getState();
    toggleDraftCity('fln');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln']);
    toggleDraftCity('sao');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln', 'sao']);
    toggleDraftCity('fln');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['sao']);
  });
});
