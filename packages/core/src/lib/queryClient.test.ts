import { configureQueryErrorHandler, queryClient } from './queryClient';

const handler = jest.fn();

beforeEach(() => {
  handler.mockClear();
  configureQueryErrorHandler(handler);
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
});

function runMutation(options: { onError?: () => void }) {
  const failure = new Error('falhou');
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(failure),
    retry: false,
    ...options,
  });
  return { failure, done: mutation.execute(undefined).catch(() => undefined) };
}

describe('Regra de negócio: QueryClient do app', () => {
  it('mantém gcTime acima das 24h do persister e staleTime de 5 minutos', () => {
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults?.gcTime).toBe(25 * 60 * 60_000);
    expect(defaults?.staleTime).toBe(5 * 60_000);
  });

  it('marca mutação com onError próprio como tratada localmente', async () => {
    const onError = jest.fn();
    const { failure, done } = runMutation({ onError });
    await done;
    expect(onError).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: true });
  });
});

describe('Tratamento de erro: QueryClient do app', () => {
  it('marca mutação sem onError como não tratada', async () => {
    const { failure, done } = runMutation({});
    await done;
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: false });
  });

  it('erros de query chegam como não tratados', async () => {
    const failure = new Error('query falhou');
    await queryClient
      .fetchQuery({
        queryKey: ['test', 'error'],
        queryFn: () => Promise.reject(failure),
        retry: false,
      })
      .catch(() => undefined);
    expect(handler).toHaveBeenCalledWith(failure, { source: 'query', handledLocally: false });
  });
});
