import { configureQueryErrorHandler, queryClient } from './queryClient';

const handler = jest.fn();

beforeEach(() => {
  handler.mockClear();
  configureQueryErrorHandler(handler);
});

afterEach(() => {
  queryClient.clear();
});

function runMutation(meta?: Record<string, unknown>) {
  const failure = new Error('falhou');
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(failure),
    retry: false,
    meta,
  });
  return { failure, done: mutation.execute(undefined).catch(() => undefined) };
}

describe('Regra de negócio: meta handledLocally do QueryClient', () => {
  it('marca mutação com meta handledLocally como tratada localmente', async () => {
    const { failure, done } = runMutation({ handledLocally: true });
    await done;
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: true });
  });
});

describe('Tratamento de erro: meta handledLocally do QueryClient', () => {
  it('mantém o aviso global quando meta não marca a mutação como tratada', async () => {
    const { failure, done } = runMutation({ handledLocally: 'sim' });
    await done;
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: false });
  });
});
