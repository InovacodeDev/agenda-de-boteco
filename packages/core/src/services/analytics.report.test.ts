import { AuthError } from '@supabase/supabase-js';

import { sanitizeCaptureEvent } from '../utils/error-reporting';
import {
  type AnalyticsAdapter,
  buildPageviewUrl,
  configureAnalytics,
  createPostHogBrowserAdapter,
  type PostHogBrowserClient,
  reportException,
  toPostHogExceptionProperties,
} from './analytics';

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

function makeBrowserClient(): jest.Mocked<PostHogBrowserClient> {
  return {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(true),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
    captureException: jest.fn(),
    register: jest.fn(),
  };
}

const postgrest42501 = {
  message: 'permission denied for table events (user a@b.com)',
  details: 'Key (email)=(a@b.com)',
  hint: '',
  code: '42501',
};

afterEach(() => {
  configureAnalytics(null);
});

describe('Regra de negócio: reportException', () => {
  it('entrega ao adapter um Error sem PII e metadado estrutural', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    reportException(postgrest42501, { method: 'x' });

    expect(adapter.captureException).toHaveBeenCalledTimes(1);
    const [error, metadata] = adapter.captureException.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Postgrest 42501');
    expect(metadata).toEqual({ errorType: 'PostgrestDatabaseError', code: '42501', method: 'x' });
  });

  it('reporta o mesmo objeto de erro uma única vez', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    const error = new Error('falhou');

    reportException(error, { method: 'service' });
    reportException(error, { method: 'queryCache' });

    expect(adapter.captureException).toHaveBeenCalledTimes(1);
  });

  it('reporta erros primitivos a cada chamada', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    reportException('falha');
    reportException('falha');

    expect(adapter.captureException).toHaveBeenCalledTimes(2);
  });

  it('ignora erro esperado de credencial inválida', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    reportException(new AuthError('Invalid login', 400, 'invalid_credentials'));

    expect(adapter.captureException).not.toHaveBeenCalled();
  });

  it('metadado explícito vence o inferido', () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    reportException(new Error('x'), { errorType: 'Custom', componentStack: 'at App' });

    expect(adapter.captureException.mock.calls[0]?.[1]).toEqual({
      errorType: 'Custom',
      componentStack: 'at App',
    });
  });
});

describe('Tratamento de erro: reportException', () => {
  it('não lança sem adapter configurado', () => {
    expect(() => reportException(new Error('x'))).not.toThrow();
  });

  it('não lança com adapter sem captureException', () => {
    const { captureException: _omitted, ...adapter } = makeAdapter();
    configureAnalytics(adapter);

    expect(() => reportException(new Error('x'))).not.toThrow();
  });

  it('não propaga falha do adapter', () => {
    const adapter = makeAdapter();
    adapter.captureException.mockImplementation(() => {
      throw new Error('SDK não inicializado');
    });
    configureAnalytics(adapter);

    expect(() => reportException(new Error('x'))).not.toThrow();
    expect(adapter.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('Regra de negócio: adapter de browser do PostHog', () => {
  it('inicializa com captura de exceções, replay mascarado e before_send', () => {
    const client = makeBrowserClient();

    createPostHogBrowserAdapter(client, { apiKey: 'ph_test_key', apiHost: 'https://h' });

    const config = client.init.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(config.capture_exceptions).toEqual({
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    });
    expect(config.session_recording).toEqual({
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
    });
    expect(config.persistence).toBe('localStorage');
    expect(config.before_send).toBe(sanitizeCaptureEvent);
    expect(config.capture_pageview).toBe(false);
    expect(config.person_profiles).toBe('identified_only');
  });

  it('captureException delega ao client com propriedades mapeadas', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key' });
    const error = new Error('x');

    adapter?.captureException?.(error, { method: 'm', errorType: 'T', code: 'c', status: 500 });

    expect(client.captureException).toHaveBeenCalledWith(error, {
      method: 'm',
      error_type: 'T',
      error_code: 'c',
      error_status: 500,
    });
  });

  it('capturePageview usa basePath e ignora origin ausente', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key', basePath: '/client' });

    adapter?.capturePageview('/events');

    expect(client.capture).toHaveBeenCalledWith('$pageview', { $current_url: '/client/events' });
  });

  it('capturePageview usa a origem de globalThis.location quando existe', () => {
    const client = makeBrowserClient();
    const adapter = createPostHogBrowserAdapter(client, { apiKey: 'key', basePath: '/admin' });
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://x.com' },
      configurable: true,
    });

    try {
      adapter?.capturePageview('/events');
    } finally {
      Reflect.deleteProperty(globalThis, 'location');
    }

    expect(client.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: 'https://x.com/admin/events',
    });
  });
});

describe('Regra de negócio: helpers de PostHog', () => {
  it('buildPageviewUrl compõe origem, basePath e path', () => {
    expect(buildPageviewUrl('https://x.com', '/client', '/events')).toBe(
      'https://x.com/client/events',
    );
    expect(buildPageviewUrl('https://x.com', undefined, '/events')).toBe('https://x.com/events');
  });

  it('toPostHogExceptionProperties mapeia fingerprint e omite chaves indefinidas', () => {
    expect(toPostHogExceptionProperties({ fingerprint: ['a', 'b'], method: 'm' })).toEqual({
      $exception_fingerprint: ['a', 'b'],
      method: 'm',
    });
    expect(
      toPostHogExceptionProperties({ componentStack: 'at X', recordId: 'r-1', status: 0 }),
    ).toEqual({ component_stack: 'at X', record_id: 'r-1', error_status: 0 });
  });
});

describe('Tratamento de erro: adapter de browser do PostHog', () => {
  it('retorna null sem apiKey e não inicializa o client', () => {
    const client = makeBrowserClient();

    expect(createPostHogBrowserAdapter(client, { basePath: '/client' })).toBeNull();
    expect(client.init).not.toHaveBeenCalled();
  });

  it('toPostHogExceptionProperties de metadado vazio devolve objeto vazio', () => {
    expect(toPostHogExceptionProperties({})).toEqual({});
  });
});
