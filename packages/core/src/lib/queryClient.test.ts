import { configureQueryErrorHandler, queryClient } from './queryClient';

const handler = jest.fn();

beforeEach(() => {
  handler.mockClear();
  configureQueryErrorHandler(handler);
});

afterAll(() => {
  queryClient.clear();
});

function runMutation(options: { onError?: () => void }) {
  const failure = new Error('falhou');
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(failure),
    ...options,
  });
  return { failure, done: mutation.execute(undefined).catch(() => undefined) };
}

describe('configureQueryErrorHandler', () => {
  it('marca mutação sem onError como não tratada', async () => {
    const { failure, done } = runMutation({});
    await done;
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: false });
  });

  it('marca mutação com onError próprio como tratada localmente', async () => {
    const onError = jest.fn();
    const { failure, done } = runMutation({ onError });
    await done;
    expect(onError).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(failure, { source: 'mutation', handledLocally: true });
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
