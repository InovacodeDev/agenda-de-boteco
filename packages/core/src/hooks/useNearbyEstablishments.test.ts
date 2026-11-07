/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';

import * as leads from '../services/musician-leads';
import * as proximity from '../services/proximity';
import { catalogKeys } from '../services/queryKeys';
import { createQueryWrapper } from '../test-utils/createQueryWrapper';
import { useMusicianLeads } from './useMusicianLeads';
import { useNearbyEstablishments } from './useNearbyEstablishments';

jest.mock('../services/proximity');
jest.mock('../services/musician-leads');
const mockedProximity = jest.mocked(proximity);
const mockedLeads = jest.mocked(leads);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Regra de negócio: proximidade e leads de músicos', () => {
  it('arredonda a origem antes de montar key e consulta', async () => {
    mockedProximity.listNearbyEstablishments.mockResolvedValue([]);
    const { wrapper, queryClient } = createQueryWrapper();

    const { result } = renderHook(
      () => useNearbyEstablishments({ origin: { lat: -27.59512, lng: -48.54867 }, radiusKm: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedProximity.listNearbyEstablishments).toHaveBeenCalledWith({
      lat: -27.595,
      lng: -48.549,
      radiusKm: 5,
    });
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      catalogKeys.establishments.nearby(-27.595, -48.549, 5),
    );
  });

  it('pagina leads de músicos com filtros e ordenação na key', async () => {
    mockedLeads.listMusicianLeads.mockResolvedValue({ items: [], nextCursor: null });
    const { wrapper, queryClient } = createQueryWrapper();
    const filters = { region: 'Floripa' };

    const { result } = renderHook(() => useMusicianLeads(filters, 'name'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedLeads.listMusicianLeads).toHaveBeenCalledWith(filters, 'name', null);
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      catalogKeys.musicianLeads.list(filters, 'name'),
    );
  });
});

describe('Tratamento de erro: proximidade e leads de músicos', () => {
  it('não consulta sem origem', () => {
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useNearbyEstablishments({ origin: null }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedProximity.listNearbyEstablishments).not.toHaveBeenCalled();
  });

  it('expõe a falha da listagem de leads', async () => {
    const failure = new Error('permissão negada');
    mockedLeads.listMusicianLeads.mockRejectedValue(failure);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useMusicianLeads({}, 'recent'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(failure);
  });
});
