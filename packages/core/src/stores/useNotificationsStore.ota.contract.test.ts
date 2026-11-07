import { PERSISTED_STORE_VERSION } from '../config/stores';
import { getAppStorage } from '../platform/storage';
import { useNotificationsStore } from './useNotificationsStore';

describe('Regra de negócio: migração persistida de useNotificationsStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('notifications');
    useNotificationsStore.setState({ readIds: [] });
  });

  it('usa PERSISTED_STORE_VERSION e migra payload legado sem version (version 0)', async () => {
    expect(useNotificationsStore.persist.getOptions().version).toBe(PERSISTED_STORE_VERSION);
    getAppStorage()?.setItem(
      'notifications',
      JSON.stringify({
        state: { readIds: ['n-legacy-1', 'n-legacy-2'] },
      }),
    );
    await useNotificationsStore.persist.rehydrate();
    expect(useNotificationsStore.getState().readIds).toEqual(['n-legacy-1', 'n-legacy-2']);
  });
});

describe('Tratamento de erro: versão desconhecida em useNotificationsStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('notifications');
    useNotificationsStore.setState({ readIds: [] });
  });

  it('volta para os defaults quando o payload persistido tem version desconhecida', async () => {
    useNotificationsStore.setState({ readIds: ['n1'] });
    getAppStorage()?.setItem(
      'notifications',
      JSON.stringify({
        state: { readIds: ['n-future'] },
        version: 99,
      }),
    );
    await useNotificationsStore.persist.rehydrate();
    expect(useNotificationsStore.getState().readIds).toEqual([]);
  });
});
