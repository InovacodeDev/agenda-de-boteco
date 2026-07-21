import { DEFAULT_EVENT_FILTERS } from '../utils/filters';
import { useFiltersStore } from './useFiltersStore';

describe('useFiltersStore', () => {
  beforeEach(() => {
    useFiltersStore.getState().resetFilters();
  });

  it('começa com os filtros default', () => {
    expect(useFiltersStore.getState().filters).toEqual(DEFAULT_EVENT_FILTERS);
  });

  it('setQuery e setDateBucket atualizam apenas o campo', () => {
    useFiltersStore.getState().setQuery('samba');
    useFiltersStore.getState().setDateBucket('today');
    const { filters } = useFiltersStore.getState();
    expect(filters.query).toBe('samba');
    expect(filters.dateBucket).toBe('today');
    expect(filters.styleIds).toEqual([]);
  });

  it('toggleStyle adiciona e remove estilos', () => {
    useFiltersStore.getState().toggleStyle('samba');
    useFiltersStore.getState().toggleStyle('rock');
    expect(useFiltersStore.getState().filters.styleIds).toEqual(['samba', 'rock']);
    useFiltersStore.getState().toggleStyle('samba');
    expect(useFiltersStore.getState().filters.styleIds).toEqual(['rock']);
  });

  it('sliders e toggles atualizam os campos correspondentes', () => {
    const state = useFiltersStore.getState();
    state.setMaxDistanceKm(10);
    state.setMinRating(4);
    state.setMaxPrice(30);
    state.toggleFreeOnly();
    state.toggleNearMe();
    state.setOpenNow(true);
    const { filters } = useFiltersStore.getState();
    expect(filters.maxDistanceKm).toBe(10);
    expect(filters.minRating).toBe(4);
    expect(filters.maxPrice).toBe(30);
    expect(filters.freeOnly).toBe(true);
    expect(filters.nearMe).toBe(true);
    expect(filters.openNow).toBe(true);
  });

  it('setMaxPrice aceita null (sem limite)', () => {
    useFiltersStore.getState().setMaxPrice(50);
    useFiltersStore.getState().setMaxPrice(null);
    expect(useFiltersStore.getState().filters.maxPrice).toBeNull();
  });

  it('setDateRange seta o intervalo e zera o dateBucket', () => {
    const store = useFiltersStore.getState();
    store.setDateBucket('today');
    store.setDateRange({ start: '2026-06-12', end: '2026-06-15' });
    const f = useFiltersStore.getState().filters;
    expect(f.dateRange).toEqual({ start: '2026-06-12', end: '2026-06-15' });
    expect(f.dateBucket).toBe('any');
  });

  it('setDateBucket limpa o dateRange', () => {
    const store = useFiltersStore.getState();
    store.setDateRange({ start: '2026-06-12', end: '2026-06-15' });
    store.setDateBucket('weekend');
    const f = useFiltersStore.getState().filters;
    expect(f.dateRange).toBeNull();
    expect(f.dateBucket).toBe('weekend');
  });

  it('setSortBy atualiza o critério', () => {
    useFiltersStore.getState().setSortBy('price');
    expect(useFiltersStore.getState().filters.sortBy).toBe('price');
  });

  it('replaceFilters substitui o objeto inteiro e resetFilters volta ao default', () => {
    useFiltersStore.getState().replaceFilters({
      ...DEFAULT_EVENT_FILTERS,
      query: 'jazz',
      minRating: 4.5,
    });
    expect(useFiltersStore.getState().filters.query).toBe('jazz');
    useFiltersStore.getState().resetFilters();
    expect(useFiltersStore.getState().filters).toEqual(DEFAULT_EVENT_FILTERS);
  });
});

describe('useFiltersStore cityIds', () => {
  beforeEach(() => {
    useFiltersStore.getState().replaceFilters(DEFAULT_EVENT_FILTERS);
  });

  it('toggleCity adiciona e remove', () => {
    useFiltersStore.getState().toggleCity('fln');
    expect(useFiltersStore.getState().filters.cityIds).toEqual(['fln']);
    useFiltersStore.getState().toggleCity('fln');
    expect(useFiltersStore.getState().filters.cityIds).toEqual([]);
  });

  it('setCityIds substitui a lista', () => {
    useFiltersStore.getState().setCityIds(['fln', 'sao']);
    expect(useFiltersStore.getState().filters.cityIds).toEqual(['fln', 'sao']);
  });
});
