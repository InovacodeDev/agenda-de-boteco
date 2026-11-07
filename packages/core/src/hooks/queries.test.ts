/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';

import * as catalog from '../services/catalog';
import { catalogKeys } from '../services/queryKeys';
import { createQueryWrapper } from '../test-utils/createQueryWrapper';
import {
  useEstablishmentQuery,
  useEstablishmentsByIds,
  useEstablishmentsQuery,
  useEventQuery,
  useEventsQuery,
} from './queries';

jest.mock('../services/catalog');
const mocked = jest.mocked(catalog);

const PAGE = { items: [], nextCursor: null };

function firstKey(queryClient: ReturnType<typeof createQueryWrapper>['queryClient']) {
  return queryClient.getQueryCache().getAll()[0]?.queryKey;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Regra de negócio: hooks de leitura do catálogo', () => {
  it('useEventsQuery usa a key de intervalo quando há datas', async () => {
    mocked.listEvents.mockResolvedValue(PAGE);
    const { wrapper, queryClient } = createQueryWrapper();
    const range = { start: '2026-11-01', end: '2026-11-30' };

    const { result } = renderHook(() => useEventsQuery(range), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstKey(queryClient)).toEqual(catalogKeys.events.listInRange(range.start, range.end));
    expect(mocked.listEvents).toHaveBeenCalledWith(null, undefined, range);
  });

  it('useEstablishmentsQuery busca no servidor com o texto aparado', async () => {
    mocked.listEstablishments.mockResolvedValue(PAGE);
    const { wrapper, queryClient } = createQueryWrapper();

    const { result } = renderHook(() => useEstablishmentsQuery('fln', '  boteco '), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstKey(queryClient)).toEqual(catalogKeys.establishments.search('fln', 'boteco'));
    expect(mocked.listEstablishments).toHaveBeenCalledWith('fln', null, undefined, 'boteco');
  });

  it('useEstablishmentsByIds ordena e deduplica os ids da key', async () => {
    mocked.listEstablishmentsByIds.mockResolvedValue([]);
    const { wrapper, queryClient } = createQueryWrapper();

    const { result } = renderHook(() => useEstablishmentsByIds(['b', 'a', 'b']), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstKey(queryClient)).toEqual(catalogKeys.establishments.byIds(['a', 'b']));
  });
});

describe('Tratamento de erro: hooks de leitura do catálogo', () => {
  it('não consulta detalhe com id vazio', () => {
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useEventQuery(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocked.getEvent).not.toHaveBeenCalled();
  });

  it('não consulta bares por id com lista vazia', () => {
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useEstablishmentsByIds([]), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocked.listEstablishmentsByIds).not.toHaveBeenCalled();
  });

  it('expõe o erro do service sem transformá-lo', async () => {
    const failure = new Error('rede');
    mocked.getEstablishment.mockRejectedValue(failure);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useEstablishmentQuery('bar-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(failure);
  });
});
