import { act, renderHook } from '@testing-library/react-native';

import { usePreferencesStore } from '@/store/usePreferencesStore';

import { useFirstLaunchLocation } from './useFirstLaunchLocation';

const mockCities = [
  {
    id: 'fln',
    name: 'Florianópolis',
    uf: 'SC',
    lat: -27.5954,
    lng: -48.548,
  },
  {
    id: 'sao',
    name: 'São Paulo',
    uf: 'SP',
    lat: -23.5505,
    lng: -46.6333,
  },
];

jest.mock('@/hooks/queries', () => ({
  useCitiesQuery: () => ({ data: mockCities }),
}));

const initialState = usePreferencesStore.getState();

describe('useFirstLaunchLocation', () => {
  beforeEach(() => {
    usePreferencesStore.setState(initialState, true);
    jest.clearAllMocks();
  });

  it('não executa request se hasOnboarded já for verdadeiro', async () => {
    usePreferencesStore.getState().completeOnboarding();
    const request = jest.fn();

    await act(async () => {
      renderHook(() => useFirstLaunchLocation(request));
    });

    expect(request).not.toHaveBeenCalled();
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });

  it('resolve cidade do catálogo e conclui onboarding quando localização é concedida', async () => {
    const request = jest.fn().mockResolvedValue({
      coords: { lat: -23.5505, lng: -46.6333 },
      geocode: { city: 'São Paulo', uf: 'SP' },
    });

    await act(async () => {
      renderHook(() => useFirstLaunchLocation(request));
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(usePreferencesStore.getState().cityId).toBe('sao');
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });

  it('resolve cidade customizada e conclui onboarding quando fora do catálogo', async () => {
    const request = jest.fn().mockResolvedValue({
      coords: { lat: -15.78, lng: -47.92 },
      geocode: { city: 'Brasília', uf: 'DF' },
    });

    await act(async () => {
      renderHook(() => useFirstLaunchLocation(request));
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(usePreferencesStore.getState().cityId).toBe('geo:-15.78,-47.92');
    expect(usePreferencesStore.getState().customCity?.name).toBe('Brasília');
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });

  it('conclui onboarding mesmo quando a localização é negada ou falha', async () => {
    const request = jest.fn().mockResolvedValue(null);

    await act(async () => {
      renderHook(() => useFirstLaunchLocation(request));
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(usePreferencesStore.getState().hasOnboarded).toBe(true);
  });
});
