jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    screen: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(),
    onFeatureFlags: jest.fn(),
    captureException: jest.fn(),
    register: jest.fn(),
  })),
}));

import PostHog from 'posthog-react-native';

import { initAnalytics } from './analytics';

describe('Regra de negócio: captura de crash nativo', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
  });

  it('liga nativeCrashes no autocapture de erros', () => {
    initAnalytics();

    expect(PostHog).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        errorTracking: expect.objectContaining({
          autocapture: expect.objectContaining({ nativeCrashes: true }),
        }),
      }),
    );
  });
});

describe('Tratamento de erro: captura de crash nativo sem chave', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
  });

  it('não instancia o PostHog quando a key está ausente', () => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;

    expect(initAnalytics()).toBeNull();
    expect(PostHog).not.toHaveBeenCalled();
  });
});
