import { PERSISTED_STORE_VERSION } from '../config/stores';
import { getAppStorage } from '../platform/storage';
import { usePreferencesStore } from './usePreferencesStore';

const initialState = usePreferencesStore.getState();

describe('usePreferencesStore', () => {
  beforeEach(() => {
    getAppStorage()?.removeItem('preferences');
    usePreferencesStore.setState(initialState, true);
  });

  it('tem cityId fln e hasOnboarded false por padrão', () => {
    expect(usePreferencesStore.getState().cityId).toBe('fln');
    expect(usePreferencesStore.getState().hasOnboarded).toBe(false);
  });

  it('setCity troca a cidade', () => {
    usePreferencesStore.getState().setCity('sao');
    expect(usePreferencesStore.getState().cityId).toBe('sao');
  });

  it('completeOnboarding marca hasOnboarded', () => {
    usePreferencesStore.getState().completeOnboarding();
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });

  it('setHasHydrated controla a flag de hidratação', () => {
    usePreferencesStore.getState().setHasHydrated(true);
    expect(usePreferencesStore.getState().hasHydrated).toBe(true);
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
