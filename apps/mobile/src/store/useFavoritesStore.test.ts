import {
  isEstablishmentFavorite,
  isEventFavorite,
  useFavoritesStore,
} from './useFavoritesStore';

describe('useFavoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ eventIds: [], establishmentIds: [] });
  });

  it('começa sem favoritos', () => {
    expect(useFavoritesStore.getState().eventIds).toEqual([]);
    expect(useFavoritesStore.getState().establishmentIds).toEqual([]);
  });

  it('toggleEvent adiciona e remove', () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().eventIds).toEqual(['ev1']);
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().eventIds).toEqual([]);
  });

  it('toggleEstablishment adiciona e remove', () => {
    useFavoritesStore.getState().toggleEstablishment('e1');
    expect(useFavoritesStore.getState().establishmentIds).toEqual(['e1']);
    useFavoritesStore.getState().toggleEstablishment('e1');
    expect(useFavoritesStore.getState().establishmentIds).toEqual([]);
  });

  it('selectors puros refletem o estado', () => {
    useFavoritesStore.getState().toggleEvent('ev2');
    useFavoritesStore.getState().toggleEstablishment('e3');
    const state = useFavoritesStore.getState();
    expect(isEventFavorite(state, 'ev2')).toBe(true);
    expect(isEventFavorite(state, 'ev1')).toBe(false);
    expect(isEstablishmentFavorite(state, 'e3')).toBe(true);
    expect(isEstablishmentFavorite(state, 'e1')).toBe(false);
  });
});
