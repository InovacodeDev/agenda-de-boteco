import {
  type AnalyticsAdapter,
  configureAnalytics,
  getConfiguredAnalytics,
  identifyAnalyticsUser,
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
