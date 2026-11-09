import { PERSISTED_STORE_VERSION } from '../config/stores';
import { getAppStorage } from '../platform/storage';
import { usePreferencesStore } from './usePreferencesStore';

const initialState = usePreferencesStore.getState();

describe('Regra de negócio: migração persistida de usePreferencesStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('preferences');
    usePreferencesStore.setState(initialState, true);
  });

  it('usa PERSISTED_STORE_VERSION e migra payload legado sem version (version 0)', async () => {
    expect(usePreferencesStore.persist.getOptions().version).toBe(PERSISTED_STORE_VERSION);
    getAppStorage()?.setItem(
      'preferences',
      JSON.stringify({
        state: { cityId: 'cur', customCity: null, hasOnboarded: true },
      }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().cityId).toBe('cur');
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });
});

describe('Tratamento de erro: versão desconhecida em usePreferencesStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('preferences');
    usePreferencesStore.setState(initialState, true);
  });

  it('volta para os defaults quando o payload persistido tem version desconhecida', async () => {
    getAppStorage()?.setItem(
      'preferences',
      JSON.stringify({
        state: { cityId: 'cur', customCity: null, hasOnboarded: true },
        version: 99,
      }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().cityId).toBe('fln');
    expect(usePreferencesStore.getState().hasOnboarded).toBe(false);
  });
});
