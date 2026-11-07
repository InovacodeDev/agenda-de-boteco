import { usePreferencesStore } from './usePreferencesStore';

const initialState = usePreferencesStore.getState();

describe('usePreferencesStore', () => {
  beforeEach(() => {
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
});
