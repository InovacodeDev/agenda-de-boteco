import type { AnalyticsContext } from './analytics';
import { configureAnalytics, registerAnalyticsContext } from './analytics';
import { createPostHogNativeAdapter, type PostHogNativeClient } from './analytics-native';

const context: AnalyticsContext = {
  app_name: '@agenda/mobile',
  app_version: '1.0.0',
  channel: 'alfa',
  platform: 'ios',
  ota_update_id: 'embedded',
};

function nativeClient(register: PostHogNativeClient['register']): PostHogNativeClient {
  return {
    capture: jest.fn(),
    screen: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(),
    onFeatureFlags: jest.fn(() => () => undefined),
    captureException: jest.fn(),
    register,
  };
}

afterEach(() => configureAnalytics(null));

describe('Regra de negócio: native adapter register', () => {
  it('chama client.register com o contexto', () => {
    const register = jest.fn().mockResolvedValue(undefined);
    configureAnalytics(createPostHogNativeAdapter(nativeClient(register)));
    registerAnalyticsContext(context);
    expect(register).toHaveBeenCalledWith(context);
  });
});

describe('Tratamento de erro: native adapter register', () => {
  it('não propaga erro síncrono do client', () => {
    const register = jest.fn(() => {
      throw new Error('sdk');
    });
    configureAnalytics(createPostHogNativeAdapter(nativeClient(register)));
    expect(() => registerAnalyticsContext(context)).not.toThrow();
  });
});
