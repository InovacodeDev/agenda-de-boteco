import { PERSISTED_STORE_VERSION } from '../config/stores';
import { getAppStorage } from '../platform/storage';
import { useFavoritesStore } from './useFavoritesStore';

describe('Regra de negócio: migração persistida de useFavoritesStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('favorites');
    useFavoritesStore.setState({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
    });
  });

  it('usa PERSISTED_STORE_VERSION e migra payload legado sem version (version 0)', async () => {
    expect(useFavoritesStore.persist.getOptions().version).toBe(PERSISTED_STORE_VERSION);
    getAppStorage()?.setItem(
      'favorites',
      JSON.stringify({
        state: {
          eventIds: ['ev-legacy'],
          establishmentIds: ['es-legacy'],
          pendingOps: [],
        },
      }),
    );
    await useFavoritesStore.persist.rehydrate();
    expect(useFavoritesStore.getState().eventIds).toEqual(['ev-legacy']);
    expect(useFavoritesStore.getState().establishmentIds).toEqual(['es-legacy']);
  });
});

describe('Tratamento de erro: versão desconhecida em useFavoritesStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('favorites');
    useFavoritesStore.setState({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
    });
  });

  it('volta para os defaults quando o payload persistido tem version desconhecida', async () => {
    useFavoritesStore.setState({
      eventIds: ['ev1'],
      establishmentIds: ['es1'],
      pendingOps: [],
    });
    getAppStorage()?.setItem(
      'favorites',
      JSON.stringify({
        state: {
          eventIds: ['ev-future'],
          establishmentIds: ['es-future'],
          pendingOps: [],
        },
        version: 99,
      }),
    );
    await useFavoritesStore.persist.rehydrate();
    expect(useFavoritesStore.getState().eventIds).toEqual([]);
    expect(useFavoritesStore.getState().establishmentIds).toEqual([]);
  });
});
