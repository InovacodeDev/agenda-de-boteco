import { type AnalyticsAdapter, configureAnalytics } from '../services/analytics';
import { handleServiceError } from './errors';

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

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  configureAnalytics(null);
  jest.restoreAllMocks();
});

describe('Regra de negócio: handleServiceError reporta ao PostHog', () => {
  it('reporta uma vez com o method e re-lança o erro original', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    const original = new Error('falhou');

    expect(() => handleServiceError(original, { method: 'catalog.list' })).toThrow(original);

    expect(adapter.captureException).toHaveBeenCalledTimes(1);
    expect(adapter.captureException.mock.calls[0]?.[1]).toMatchObject({ method: 'catalog.list' });
  });

  it('não envia ErrorContext.args ao adapter', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    expect(() =>
      handleServiceError(new Error('x'), { method: 'm', args: { eventId: 'ev-1' } }),
    ).toThrow();

    expect(JSON.stringify(adapter.captureException.mock.calls)).not.toContain('ev-1');
  });
});

describe('Tratamento de erro: handleServiceError reporta ao PostHog', () => {
  it('re-lança o erro original mesmo se o adapter lançar', () => {
    const adapter = makeAdapter();
    adapter.captureException.mockImplementation(() => {
      throw new Error('quota');
    });
    configureAnalytics(adapter);
    const original = new Error('falhou');

    expect(() => handleServiceError(original, { method: 'm' })).toThrow(original);
  });

  it('re-lança sem adapter configurado', () => {
    const original = new Error('falhou');

    expect(() => handleServiceError(original, { method: 'm' })).toThrow(original);
  });
});
