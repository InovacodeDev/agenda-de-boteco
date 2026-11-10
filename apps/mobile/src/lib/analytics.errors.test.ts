const mockCaptureException = jest.fn();
const mockRegister = jest.fn();

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    screen: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(),
    onFeatureFlags: jest.fn(),
    captureException: mockCaptureException,
    register: mockRegister,
  })),
}));

import { configureAnalytics, reportException, sanitizeCaptureEvent } from '@agenda/core';
import PostHog from 'posthog-react-native';

import { initAnalytics } from './analytics';

describe('Regra de negócio: captura de exceções no mobile', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
    configureAnalytics(null);
  });

  it('inicializa o PostHog com autocapture de erros e perfis só para identificados', () => {
    initAnalytics();

    expect(PostHog).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        personProfiles: 'identified_only',
        errorTracking: expect.objectContaining({
          autocapture: expect.objectContaining({
            uncaughtExceptions: true,
            unhandledRejections: true,
            console: false,
            nativeCrashes: true,
          }),
        }),
        before_send: sanitizeCaptureEvent,
      }),
    );
  });

  it('reportException chega ao captureException do SDK com metadado mapeado', () => {
    configureAnalytics(initAnalytics());
    const error = new Error('boom');

    reportException(error, { method: 'ui.errorBoundary', componentStack: 'at Home' });

    expect(mockCaptureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ method: 'ui.errorBoundary', component_stack: 'at Home' }),
    );
  });
});

describe('Tratamento de erro: captura de exceções no mobile', () => {
  afterEach(() => {
    configureAnalytics(null);
  });

  it('initAnalytics retorna null sem key e não instancia o SDK', () => {
    const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    jest.clearAllMocks();

    expect(initAnalytics()).toBeNull();
    expect(PostHog).not.toHaveBeenCalled();

    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
  });

  it('reportException não propaga falha do SDK', () => {
    const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    mockCaptureException.mockImplementationOnce(() => {
      throw new Error('sdk down');
    });
    configureAnalytics(initAnalytics());

    expect(() => reportException(new Error('boom'))).not.toThrow();

    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
  });
});
