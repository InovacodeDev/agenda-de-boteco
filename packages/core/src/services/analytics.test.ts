import {
  type AnalyticsAdapter,
  configureAnalytics,
  createPostHogBrowserAdapter,
  getConfiguredAnalytics,
  identifyAnalyticsUser,
  type PostHogBrowserClient,
  resetAnalytics,
  trackEvent,
  trackPageview,
} from './analytics';

function makeAdapter(): jest.Mocked<AnalyticsAdapter> {
  return {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(false),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
  };
}

afterEach(() => {
  configureAnalytics(null);
});

describe('sem adapter configurado', () => {
  it('getConfiguredAnalytics retorna null', () => {
    expect(getConfiguredAnalytics()).toBeNull();
  });

  it('trackPageview não lança', () => {
    expect(() => trackPageview('/eventos')).not.toThrow();
  });

  it('trackEvent não lança', () => {
    expect(() => trackEvent('click_share', { eventId: 'ev-1' })).not.toThrow();
  });

  it('identifyAnalyticsUser não lança', () => {
    expect(() => identifyAnalyticsUser('user-uuid')).not.toThrow();
  });

  it('resetAnalytics não lança', () => {
    expect(() => resetAnalytics()).not.toThrow();
  });
});

describe('com adapter configurado', () => {
  it('getConfiguredAnalytics retorna o adapter registrado', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    expect(getConfiguredAnalytics()).toBe(adapter);
  });

  it('trackPageview chama capturePageview com o path', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    trackPageview('/eventos/123');

    expect(adapter.capturePageview).toHaveBeenCalledWith('/eventos/123');
  });

  it('trackEvent chama captureEvent com nome e properties', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    trackEvent('click_share', { establishmentId: 'es-1', count: 3 });

    expect(adapter.captureEvent).toHaveBeenCalledWith('click_share', {
      establishmentId: 'es-1',
      count: 3,
    });
  });

  it('trackEvent sem properties chama captureEvent só com o nome', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    trackEvent('page_ready');

    expect(adapter.captureEvent).toHaveBeenCalledWith('page_ready', undefined);
  });

  it('identifyAnalyticsUser chama identify com o id opaco', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    identifyAnalyticsUser('user-uuid');

    expect(adapter.identify).toHaveBeenCalledWith('user-uuid');
  });

  it('resetAnalytics chama reset', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    resetAnalytics();

    expect(adapter.reset).toHaveBeenCalledTimes(1);
  });
});

function makeBrowserClient(): jest.Mocked<PostHogBrowserClient> {
  return {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(true),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
  };
}

describe('createPostHogBrowserAdapter', () => {
  it('retorna null se apiKey não for informada ou vazia', () => {
    const client = makeBrowserClient();
    expect(createPostHogBrowserAdapter(client, {})).toBeNull();
    expect(createPostHogBrowserAdapter(client, { apiKey: '' })).toBeNull();
    expect(client.init).not.toHaveBeenCalled();
  });

  it('inicializa o cliente PostHog com as configurações corretas', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, {
      apiKey: 'ph_test_key',
      apiHost: 'https://app.posthog.com',
    });

    expect(adapter).not.toBeNull();
    expect(client.init).toHaveBeenCalledWith('ph_test_key', {
      api_host: 'https://app.posthog.com',
      capture_pageview: false,
      person_profiles: 'identified_only',
    });
  });

  it('capturePageview chama client.capture com $pageview e url', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });

    adapter?.capturePageview('/events');
    expect(client.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: '/events',
    });
  });

  it('captureEvent chama client.capture com nome e propriedades', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });

    adapter?.captureEvent('filter_applied', { category: 'rock' });
    expect(client.capture).toHaveBeenCalledWith('filter_applied', {
      category: 'rock',
    });
  });

  it('identify chama client.identify com userId', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });

    adapter?.identify('user-456');
    expect(client.identify).toHaveBeenCalledWith('user-456');
  });

  it('reset chama client.reset', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });

    adapter?.reset();
    expect(client.reset).toHaveBeenCalledTimes(1);
  });

  it('isFeatureEnabled retorna valor do client ou false como fallback', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });

    expect(adapter?.isFeatureEnabled('new-nav')).toBe(true);
    expect(client.isFeatureEnabled).toHaveBeenCalledWith('new-nav');

    client.isFeatureEnabled.mockReturnValueOnce(undefined);
    expect(adapter?.isFeatureEnabled('undefined-flag')).toBe(false);
  });

  it('onFeatureFlags delega para client.onFeatureFlags', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });
    const cb = jest.fn();

    adapter?.onFeatureFlags(cb);
    expect(client.onFeatureFlags).toHaveBeenCalledWith(cb);
  });
});

