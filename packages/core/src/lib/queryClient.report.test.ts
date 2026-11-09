import { type AnalyticsAdapter, configureAnalytics } from '../services/analytics';
import { handleServiceError } from '../utils/errors';
import { configureQueryErrorHandler, queryClient } from './queryClient';

function makeAdapter(): jest.Mocked<Required<AnalyticsAdapter>> {
  return {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(false),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
    captureException: jest.fn(),
  };
}

const handler = jest.fn();

function failQuery(error: unknown, key: string) {
  return queryClient
    .fetchQuery({ queryKey: ['report', key], queryFn: () => Promise.reject(error), retry: false })
    .catch(() => undefined);
}

beforeEach(() => {
  handler.mockClear();
  configureQueryErrorHandler(handler);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  configureAnalytics(null);
  queryClient.clear();
  jest.restoreAllMocks();
});

describe('Regra de negócio: QueryCache e MutationCache reportam ao PostHog', () => {
  it('reporta erro de query com method queryCache', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    await failQuery(new Error('q'), 'query');

    expect(adapter.captureException).toHaveBeenCalledTimes(1);
    expect(adapter.captureException.mock.calls[0]?.[1]).toMatchObject({ method: 'queryCache' });
  });

  it('reporta erro de mutação com method mutationCache', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(new Error('m')), retry: false })
      .execute(undefined)
      .catch(() => undefined);

    expect(adapter.captureException.mock.calls[0]?.[1]).toMatchObject({ method: 'mutationCache' });
  });

  it('erro que passa por handleServiceError e pelo QueryCache gera um único reporte', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    await queryClient
      .fetchQuery({
        queryKey: ['report', 'dedup'],
        queryFn: () => handleServiceError(new Error('db'), { method: 'catalog.list' }),
        retry: false,
      })
      .catch(() => undefined);

    expect(adapter.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: QueryCache e MutationCache reportam ao PostHog', () => {
  it('ainda chama o handler do app se o adapter lançar', async () => {
    const adapter = makeAdapter();
    adapter.captureException.mockImplementation(() => {
      throw new Error('quota');
    });
    configureAnalytics(adapter);
    const failure = new Error('q');

    await failQuery(failure, 'throws');

    expect(handler).toHaveBeenCalledWith(failure, { source: 'query', handledLocally: false });
  });

  it('chama o handler do app sem adapter configurado', async () => {
    const failure = new Error('q');

    await failQuery(failure, 'no-adapter');

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
