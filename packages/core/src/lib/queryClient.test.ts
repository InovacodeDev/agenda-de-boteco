import { configureQueryErrorHandler, queryClient } from './queryClient';

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
});

describe('Regra de negócio: QueryClient do app', () => {
  it('mantém gcTime acima das 24h do persister e staleTime de 5 minutos', () => {
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults?.gcTime).toBe(25 * 60 * 60_000);
    expect(defaults?.staleTime).toBe(5 * 60_000);
  });

  it('entrega erro de query ao handler registrado pelo app', async () => {
    const handler = jest.fn();
    configureQueryErrorHandler(handler);
    const failure = new Error('rede');

    await queryClient
      .fetchQuery({ queryKey: ['teste', 'erro'], queryFn: () => Promise.reject(failure), retry: false })
      .catch(() => undefined);

    expect(handler).toHaveBeenCalledWith(failure);
  });
});

describe('Tratamento de erro: QueryClient do app', () => {
  it('entrega erro de mutação ao handler registrado pelo app', async () => {
    const handler = jest.fn();
    configureQueryErrorHandler(handler);
    const failure = new Error('rls');

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(failure), retry: false })
      .execute(undefined)
      .catch(() => undefined);

    expect(handler).toHaveBeenCalledWith(failure);
  });
});
