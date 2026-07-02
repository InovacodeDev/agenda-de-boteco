import type { FavoriteTarget } from '../services/favorites';
import {
  isEstablishmentFavorite,
  isEventFavorite,
  useFavoritesStore,
} from './useFavoritesStore';

const mockAddServerFavorite = jest.fn<Promise<void>, [string, FavoriteTarget]>(() =>
  Promise.resolve(),
);
const mockRemoveServerFavorite = jest.fn<Promise<void>, [string, FavoriteTarget]>(() =>
  Promise.resolve(),
);
const mockFetchServerFavorites = jest.fn<Promise<FavoriteTarget[]>, []>(() =>
  Promise.resolve([]),
);

jest.mock('../services/favorites', () => ({
  addServerFavorite: (userId: string, target: FavoriteTarget) =>
    mockAddServerFavorite(userId, target),
  removeServerFavorite: (userId: string, target: FavoriteTarget) =>
    mockRemoveServerFavorite(userId, target),
  fetchServerFavorites: () => mockFetchServerFavorites(),
}));

describe('useFavoritesStore', () => {
  beforeEach(() => {
    mockAddServerFavorite.mockClear();
    mockRemoveServerFavorite.mockClear();
    mockFetchServerFavorites.mockClear();
    mockAddServerFavorite.mockImplementation(() => Promise.resolve());
    mockRemoveServerFavorite.mockImplementation(() => Promise.resolve());
    mockFetchServerFavorites.mockImplementation(() => Promise.resolve([]));
    useFavoritesStore.setState({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
    });
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

  it('toggleEvent enfileira uma op pendente de add', () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'event', id: 'ev1' } },
    ]);
  });

  it('toggleEvent duas vezes resulta em fila add+remove e estado vazio', () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().eventIds).toEqual([]);
    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'event', id: 'ev1' } },
      { op: 'remove', target: { type: 'event', id: 'ev1' } },
    ]);
  });

  it('flushQueue deslogado (sem userId) é no-op e mantém a fila', async () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    await useFavoritesStore.getState().flushQueue(null);
    expect(mockAddServerFavorite).not.toHaveBeenCalled();
    expect(useFavoritesStore.getState().pendingOps).toHaveLength(1);
  });

  it('flushQueue logado drena a fila chamando o service e a esvazia', async () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    useFavoritesStore.getState().toggleEstablishment('es1');
    await useFavoritesStore.getState().flushQueue('userX');
    expect(mockAddServerFavorite).toHaveBeenCalledWith('userX', { type: 'event', id: 'ev1' });
    expect(mockAddServerFavorite).toHaveBeenCalledWith('userX', {
      type: 'establishment',
      id: 'es1',
    });
    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
  });

  it('flushQueue mantém ops que falharam na fila', async () => {
    mockAddServerFavorite.mockRejectedValueOnce(new Error('network'));
    useFavoritesStore.getState().toggleEvent('ev1');
    await useFavoritesStore.getState().flushQueue('userX');
    expect(useFavoritesStore.getState().pendingOps).toHaveLength(1);
  });

  it('mergeLocalIntoServer envia favoritos locais ainda não no servidor', async () => {
    mockFetchServerFavorites.mockResolvedValueOnce([{ type: 'event', id: 'ev1' }]);
    useFavoritesStore.setState({
      eventIds: ['ev1', 'ev2'],
      establishmentIds: ['es1'],
      pendingOps: [],
    });
    await useFavoritesStore.getState().mergeLocalIntoServer('userX');
    expect(mockAddServerFavorite).toHaveBeenCalledWith('userX', { type: 'event', id: 'ev2' });
    expect(mockAddServerFavorite).toHaveBeenCalledWith('userX', {
      type: 'establishment',
      id: 'es1',
    });
    expect(mockAddServerFavorite).not.toHaveBeenCalledWith('userX', { type: 'event', id: 'ev1' });
  });

  it('mergeLocalIntoServer hidrata o estado local com favoritos do servidor', async () => {
    mockFetchServerFavorites.mockResolvedValueOnce([
      { type: 'event', id: 'ev-server' },
      { type: 'establishment', id: 'es-server' },
    ]);
    useFavoritesStore.setState({ eventIds: [], establishmentIds: [], pendingOps: [] });
    await useFavoritesStore.getState().mergeLocalIntoServer('userX');
    expect(useFavoritesStore.getState().eventIds).toEqual(['ev-server']);
    expect(useFavoritesStore.getState().establishmentIds).toEqual(['es-server']);
  });

  it('mergeLocalIntoServer une servidor e local sem duplicar', async () => {
    mockFetchServerFavorites.mockResolvedValueOnce([
      { type: 'event', id: 'ev1' },
      { type: 'event', id: 'ev-server' },
    ]);
    useFavoritesStore.setState({ eventIds: ['ev1', 'ev2'], establishmentIds: [], pendingOps: [] });
    await useFavoritesStore.getState().mergeLocalIntoServer('userX');
    expect(useFavoritesStore.getState().eventIds).toEqual(['ev1', 'ev2', 'ev-server']);
  });

  it('flushQueue preserva ops enfileiradas durante o flush (C1)', async () => {
    mockAddServerFavorite.mockImplementationOnce(async () => {
      useFavoritesStore.getState().toggleEstablishment('es-novo');
    });
    useFavoritesStore.getState().toggleEvent('ev1');
    await useFavoritesStore.getState().flushQueue('userX');
    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'establishment', id: 'es-novo' } },
    ]);
  });

  it('mergeLocalIntoServer limpa a fila ao final (C2)', async () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().pendingOps).toHaveLength(1);
    await useFavoritesStore.getState().mergeLocalIntoServer('userX');
    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
  });
});
