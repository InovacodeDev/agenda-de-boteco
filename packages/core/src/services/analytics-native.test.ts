import { sanitizeCaptureEvent } from '../utils/error-reporting';
import { configureAnalytics, reportException } from './analytics';
import {
  buildPostHogNativeOptions,
  createPostHogNativeAdapter,
  type PostHogNativeClient,
} from './analytics-native';

function makeClient(): jest.Mocked<PostHogNativeClient> {
  return {
    capture: jest.fn(),
    screen: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
    captureException: jest.fn(),
    register: jest.fn(),
  };
}

afterEach(() => {
  configureAnalytics(null);
});

describe('Regra de negócio: opções do PostHog nativo', () => {
  it('liga autocapture de exceções sem console e sem crash nativo', () => {
    const options = buildPostHogNativeOptions({ host: 'https://ph.test', nativeCrashes: false });
    expect(options.host).toBe('https://ph.test');
    expect(options.personProfiles).toBe('identified_only');
    expect(options.errorTracking.autocapture).toEqual({
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: false,
      nativeCrashes: false,
    });
  });

  it('propaga nativeCrashes e usa o sanitizador zero-PII no before_send', () => {
    const options = buildPostHogNativeOptions({ nativeCrashes: true });
    expect(options.errorTracking.autocapture.nativeCrashes).toBe(true);
    expect(options.before_send).toBe(sanitizeCaptureEvent);
  });
});

describe('Regra de negócio: adapter PostHog nativo', () => {
  it('mapeia capturePageview para screen e delega o restante', () => {
    const client = makeClient();
    client.isFeatureEnabled.mockReturnValueOnce(true);
    const adapter = createPostHogNativeAdapter(client);

    adapter.capturePageview('/feed');
    adapter.captureEvent('favorite_toggled', { isFavorite: true });
    adapter.identify('user-id');
    adapter.reset();

    expect(client.screen).toHaveBeenCalledWith('/feed');
    expect(client.capture).toHaveBeenCalledWith('favorite_toggled', { isFavorite: true });
    expect(client.identify).toHaveBeenCalledWith('user-id');
    expect(client.reset).toHaveBeenCalled();
    expect(adapter.isFeatureEnabled('flag')).toBe(true);
  });

  it('delega captureException com as propriedades mapeadas', () => {
    const client = makeClient();
    const adapter = createPostHogNativeAdapter(client);
    const error = new Error('boom');

    adapter.captureException?.(error, {
      method: 'ui.errorBoundary',
      errorType: 'Error',
      componentStack: 'at Home',
    });

    expect(client.captureException).toHaveBeenCalledWith(error, {
      method: 'ui.errorBoundary',
      error_type: 'Error',
      component_stack: 'at Home',
    });
  });

  it('reportException chega ao captureException do client', () => {
    const client = makeClient();
    configureAnalytics(createPostHogNativeAdapter(client));

    reportException(new Error('boom'), { method: 'ui.errorBoundary' });

    expect(client.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: adapter PostHog nativo', () => {
  it('isFeatureEnabled retorna false quando o SDK ainda não carregou as flags', () => {
    const client = makeClient();
    client.isFeatureEnabled.mockReturnValueOnce(undefined);
    expect(createPostHogNativeAdapter(client).isFeatureEnabled('flag')).toBe(false);
  });

  it('reportException não propaga falha do SDK', () => {
    const client = makeClient();
    client.captureException.mockImplementation(() => {
      throw new Error('sdk down');
    });
    configureAnalytics(createPostHogNativeAdapter(client));

    expect(() => reportException(new Error('boom'))).not.toThrow();
  });
});
