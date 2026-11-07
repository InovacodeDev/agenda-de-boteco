/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import * as ratings from '../services/establishment-ratings';
import { catalogKeys } from '../services/queryKeys';
import { createQueryWrapper } from '../test-utils/createQueryWrapper';
import { useUpsertEstablishmentRating, useUserEstablishmentRating } from './useEstablishmentRating';

jest.mock('../services/establishment-ratings');
const mocked = jest.mocked(ratings);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Regra de negócio: avaliação do usuário', () => {
  it('lê a nota do usuário com a key da factory', async () => {
    mocked.getUserEstablishmentRating.mockResolvedValue(null);
    const { wrapper, queryClient } = createQueryWrapper();

    const { result } = renderHook(() => useUserEstablishmentRating('bar-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      catalogKeys.establishmentRatings.user('bar-1'),
    );
  });

  it('upsert invalida nota, avaliações, resumo e estabelecimento', async () => {
    mocked.upsertEstablishmentRating.mockResolvedValue(undefined as never);
    const { wrapper, queryClient } = createQueryWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpsertEstablishmentRating(), { wrapper });
    await act(() => result.current.mutateAsync({ establishmentId: 'bar-1', rating: 5 }));

    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual([
      catalogKeys.establishmentRatings.user('bar-1'),
      catalogKeys.establishmentRatings.byEstablishment('bar-1'),
      catalogKeys.establishmentRatings.summary('bar-1'),
      catalogKeys.establishments.detail('bar-1'),
      catalogKeys.establishments.root,
    ]);
  });
});

describe('Tratamento de erro: avaliação do usuário', () => {
  it('não consulta sem estabelecimento', () => {
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useUserEstablishmentRating(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocked.getUserEstablishmentRating).not.toHaveBeenCalled();
  });

  it('upsert com falha não invalida o cache', async () => {
    const failure = new Error('rls');
    mocked.upsertEstablishmentRating.mockRejectedValue(failure);
    const { wrapper, queryClient } = createQueryWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpsertEstablishmentRating(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ establishmentId: 'bar-1', rating: 5 }),
      ).rejects.toBe(failure);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
