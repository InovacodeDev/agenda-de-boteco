import {
  type AnalyticsAdapter,
  type AnalyticsContext,
  type AnalyticsContextRegistrar,
  configureAnalytics,
  createPostHogBrowserAdapter,
  type PostHogBrowserClient,
  registerAnalyticsContext,
} from './analytics';

const context: AnalyticsContext = {
  app_name: '@agenda/web',
  app_version: '1.2.3',
  channel: 'production',
  platform: 'web',
};

function baseAdapter(
  overrides: Partial<AnalyticsAdapter & AnalyticsContextRegistrar> = {},
): AnalyticsAdapter {
  return {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(() => false),
    onFeatureFlags: jest.fn(() => () => undefined),
    ...overrides,
  };
}

afterEach(() => configureAnalytics(null));

describe('Regra de negócio: registerAnalyticsContext', () => {
  it('repassa o contexto ao adapter', () => {
    const register = jest.fn();
    configureAnalytics(baseAdapter({ register }));
    registerAnalyticsContext(context);
    expect(register).toHaveBeenCalledWith(context);
  });

  it('browser adapter chama client.register com o contexto', () => {
    const client: PostHogBrowserClient = {
      init: jest.fn(),
      capture: jest.fn(),
      captureException: jest.fn(),
      register: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      isFeatureEnabled: jest.fn(),
      onFeatureFlags: jest.fn(() => () => undefined),
    };
    configureAnalytics(createPostHogBrowserAdapter(client, { apiKey: 'k' }));
    registerAnalyticsContext(context);
    expect(client.register).toHaveBeenCalledWith(context);
  });
});

describe('Tratamento de erro: registerAnalyticsContext', () => {
  it('não lança sem adapter', () => {
    configureAnalytics(null);
    expect(() => registerAnalyticsContext(context)).not.toThrow();
  });

  it('não lança com adapter sem register', () => {
    configureAnalytics(baseAdapter());
    expect(() => registerAnalyticsContext(context)).not.toThrow();
  });

  it('não propaga erro lançado pelo register', () => {
    configureAnalytics(
      baseAdapter({
        register: () => {
          throw new Error('sdk');
        },
      }),
    );
    expect(() => registerAnalyticsContext(context)).not.toThrow();
  });
});
