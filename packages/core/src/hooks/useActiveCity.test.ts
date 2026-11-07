/**
 * @jest-environment jsdom
 */
import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { City } from '../schemas';
import * as catalog from '../services/catalog';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { createQueryWrapper } from '../test-utils/createQueryWrapper';
import { useActiveCity } from './useActiveCity';
import { useConnectivity } from './useConnectivity';

jest.mock('../services/catalog');
const mocked = jest.mocked(catalog);

const FLN: City = { id: 'fln', name: 'Florianópolis', uf: 'SC', lat: -27.59, lng: -48.55 };
const POA: City = { id: 'poa', name: 'Porto Alegre', uf: 'RS', lat: -30.03, lng: -51.23 };
const VIRTUAL: City = { id: 'geo-1', name: 'Garopaba', uf: 'SC', lat: -28.02, lng: -48.61 };

beforeEach(() => {
  jest.resetAllMocks();
  usePreferencesStore.setState({ cityId: 'poa', customCity: null });
  onlineManager.setOnline(true);
});

describe('Regra de negócio: cidade ativa e conectividade', () => {
  it('resolve a cidade escolhida no catálogo', async () => {
    mocked.listCities.mockResolvedValue([FLN, POA]);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useActiveCity(), { wrapper });

    await waitFor(() => expect(result.current).toEqual(POA));
  });

  it('prefere a cidade virtual da geolocalização quando selecionada', () => {
    mocked.listCities.mockReturnValue(new Promise(() => {}));
    usePreferencesStore.setState({ cityId: 'geo-1', customCity: VIRTUAL });
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useActiveCity(), { wrapper });

    expect(result.current).toEqual(VIRTUAL);
  });

  it('reflete mudanças do onlineManager', () => {
    const { result } = renderHook(() => useConnectivity());
    expect(result.current.isOnline).toBe(true);

    act(() => onlineManager.setOnline(false));

    expect(result.current.isOnline).toBe(false);
  });
});

describe('Tratamento de erro: cidade ativa', () => {
  it('fica indefinida enquanto o catálogo carrega e não há cidade virtual', () => {
    mocked.listCities.mockReturnValue(new Promise(() => {}));
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useActiveCity(), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it('cai na primeira cidade quando o id salvo não existe mais', async () => {
    mocked.listCities.mockResolvedValue([FLN, POA]);
    usePreferencesStore.setState({ cityId: 'removida', customCity: null });
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useActiveCity(), { wrapper });

    await waitFor(() => expect(result.current).toEqual(FLN));
  });
});
