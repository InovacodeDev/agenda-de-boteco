/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import * as catalog from '../services/catalog';
import * as owner from '../services/establishment-owner';
import * as ownedEvents from '../services/owned-events';
import { catalogKeys } from '../services/queryKeys';
import { createQueryWrapper } from '../test-utils/createQueryWrapper';
import { useOwnedEstablishment } from './useOwnedEstablishment';
import { useDeleteOwnedEvent, useDeleteOwnedEventGroup, useOwnedEvents } from './useOwnedEvents';

jest.mock('../services/catalog');
jest.mock('../services/establishment-owner');
jest.mock('../services/owned-events');
const mockedCatalog = jest.mocked(catalog);
const mockedOwner = jest.mocked(owner);
const mockedOwnedEvents = jest.mocked(ownedEvents);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Regra de negócio: painel do dono', () => {
  it('lista eventos do bar do dono com a key owned', async () => {
    mockedOwner.getOwnedEstablishmentId.mockResolvedValue('bar-1');
    mockedCatalog.listOwnedEvents.mockResolvedValue({ items: [], nextCursor: null });
    const { wrapper, queryClient } = createQueryWrapper();

    const { result } = renderHook(() => useOwnedEvents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedCatalog.listOwnedEvents).toHaveBeenCalledWith('bar-1', null);
    const keys = queryClient.getQueryCache().getAll().map((query) => query.queryKey);
    expect(keys).toContainEqual(catalogKeys.events.owned('bar-1'));
  });

  it('carrega o estabelecimento do dono pelo id vinculado', async () => {
    mockedOwner.getOwnedEstablishmentId.mockResolvedValue('bar-1');
    mockedCatalog.getEstablishment.mockResolvedValue(null as never);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useOwnedEstablishment(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedCatalog.getEstablishment).toHaveBeenCalledWith('bar-1');
  });

  it.each([
    ['evento', useDeleteOwnedEvent, () => mockedOwnedEvents.deleteOwnedEvent],
    ['série', useDeleteOwnedEventGroup, () => mockedOwnedEvents.deleteOwnedEventGroup],
  ] as const)('apagar %s invalida a raiz de eventos', async (_label, useHook, service) => {
    service().mockResolvedValue(undefined);
    const { wrapper, queryClient } = createQueryWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useHook(), { wrapper });
    await act(() => result.current.mutateAsync('id-1'));

    expect(service()).toHaveBeenCalledWith('id-1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.events.root });
  });
});

describe('Tratamento de erro: painel do dono', () => {
  it('não lista eventos sem bar vinculado', async () => {
    mockedOwner.getOwnedEstablishmentId.mockResolvedValue(null);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useOwnedEvents(), { wrapper });

    await waitFor(() => expect(mockedOwner.getOwnedEstablishmentId).toHaveBeenCalled());
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedCatalog.listOwnedEvents).not.toHaveBeenCalled();
  });

  it('falha ao apagar não invalida o cache', async () => {
    const failure = new Error('rls');
    mockedOwnedEvents.deleteOwnedEvent.mockRejectedValue(failure);
    const { wrapper, queryClient } = createQueryWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteOwnedEvent(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('id-1')).rejects.toBe(failure);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('expõe erro ao descobrir o bar do dono', async () => {
    const failure = new Error('rede');
    mockedOwner.getOwnedEstablishmentId.mockRejectedValue(failure);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useOwnedEstablishment(), { wrapper });

    await waitFor(() => expect(mockedOwner.getOwnedEstablishmentId).toHaveBeenCalled());
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedCatalog.getEstablishment).not.toHaveBeenCalled();
  });
});
