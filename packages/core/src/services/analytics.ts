/**
 * Fachada de analytics/feature flags, agnóstica de provider — mesmo padrão de
 * `supabase/client.ts` (interface + configure/get). `posthog-js` é browser-only
 * e não pode ser dependência do core (o mobile também o consome); cada app Next
 * injeta o adapter concreto no bootstrap via `configureAnalytics`.
 *
 * Regra de PII (Seção 0 do AGENTS.md): `properties` de `trackEvent` aceita só
 * identificadores opacos e metadados (ids, contagens, nomes de categoria) —
 * nunca e-mail, telefone, CPF ou outro dado pessoal. `identifyAnalyticsUser`
 * recebe só o uuid opaco do Supabase, nunca e-mail/telefone.
 */
import {
  buildSafeErrorMetadata,
  isExpectedError,
  type SafeErrorMetadata,
  sanitizeCaptureEvent,
  toReportableError,
} from '../utils/error-reporting';

export interface AnalyticsContext {
  app_name: string;
  app_version: string;
  channel: string;
  platform: 'web' | 'ios' | 'android';
  ota_update_id?: string;
}

/**
 * Capacidade separada de `AnalyticsAdapter` (não campo dele): testes travados tipam
 * mocks como `Mocked<Required<AnalyticsAdapter>>`, e um campo novo os quebraria.
 */
export interface AnalyticsContextRegistrar {
  register(context: AnalyticsContext): void;
}

function canRegister(
  value: AnalyticsAdapter,
): value is AnalyticsAdapter & AnalyticsContextRegistrar {
  return 'register' in value && typeof value.register === 'function';
}

export interface AnalyticsAdapter {
  /** Opcional: adapters sem Error Tracking (e mocks de teste) simplesmente não reportam. */
  captureException?(error: Error, metadata: SafeErrorMetadata): void;
  capturePageview(path: string): void;
  captureEvent(name: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
  isFeatureEnabled(key: string): boolean;
  /** Chamado quando as flags carregam/mudam (assíncrono no PostHog). Retorna cleanup. */
  onFeatureFlags(callback: () => void): () => void;
}

let adapter: AnalyticsAdapter | null = null;

/** Cada app registra seu adapter no bootstrap (ou null, se rodar sem analytics configurado). */
export function configureAnalytics(instance: AnalyticsAdapter | null): void {
  adapter = instance;
}

/** Adapter configurado, ou null se não houver. */
export function getConfiguredAnalytics(): AnalyticsAdapter | null {
  return adapter;
}

/**
 * Funções de conveniência: nunca lançam. Falha de tracking não pode quebrar a
 * navegação (mesmo espírito de `services/metrics.ts`), e sem adapter
 * configurado (dev sem env var) elas são no-op silencioso.
 */
export function trackPageview(path: string): void {
  adapter?.capturePageview(path);
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  adapter?.captureEvent(name, properties);
}

export function identifyAnalyticsUser(userId: string): void {
  adapter?.identify(userId);
}

export function resetAnalytics(): void {
  adapter?.reset();
}

export function registerAnalyticsContext(context: AnalyticsContext): void {
  try {
    if (adapter && canRegister(adapter)) {
      adapter.register(context);
    }
  } catch {
    // NOTE: falha do SDK não pode quebrar o bootstrap do app.
  }
}

const reportedErrors = new WeakSet<object>();

/**
 * Ponto único de reporte de exceção. O `WeakSet` evita `$exception` duplicado
 * quando o mesmo erro passa por `handleServiceError` e depois pelo QueryCache.
 * Nunca lança: falha de tracking não pode esconder o erro original.
 */
export function reportException(error: unknown, metadata?: SafeErrorMetadata): void {
  try {
    if (!adapter?.captureException || isExpectedError(error)) {
      return;
    }
    if (typeof error === 'object' && error !== null) {
      if (reportedErrors.has(error)) {
        return;
      }
      reportedErrors.add(error);
    }
    adapter.captureException(toReportableError(error), {
      ...buildSafeErrorMetadata(error),
      ...metadata,
    });
  } catch {
    // NOTE: falha do SDK (não inicializado, quota) não pode propagar para o fluxo do app.
  }
}

export function toPostHogExceptionProperties(metadata: SafeErrorMetadata): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    method: metadata.method,
    error_type: metadata.errorType,
    error_code: metadata.code,
    error_status: metadata.status,
    component_stack: metadata.componentStack,
    record_id: metadata.recordId,
    $exception_fingerprint: metadata.fingerprint,
  };
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

export function buildPageviewUrl(
  origin: string,
  basePath: string | undefined,
  path: string,
): string {
  return `${origin}${basePath ?? ''}${path}`;
}

export interface PostHogBrowserClient {
  init(apiKey: string, config?: Record<string, unknown>): void;
  capture(event: string, properties?: Record<string, unknown>): void;
  captureException(error: unknown, properties?: Record<string, unknown>): void;
  register(properties: Record<string, unknown>): void;
  identify(distinctId: string): void;
  reset(): void;
  isFeatureEnabled(key: string): boolean | undefined;
  onFeatureFlags(callback: () => void): () => void;
}

export interface PostHogBrowserConfig {
  apiKey?: string;
  apiHost?: string;
  basePath?: string;
  uiHost?: string;
}

export function createPostHogBrowserAdapter(
  client: PostHogBrowserClient,
  config: PostHogBrowserConfig,
): (AnalyticsAdapter & AnalyticsContextRegistrar) | null {
  if (!config.apiKey) return null;

  client.init(config.apiKey, {
    api_host: config.apiHost,
    ...(config.uiHost ? { ui_host: config.uiHost } : {}),
    capture_pageview: false,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' },
    before_send: sanitizeCaptureEvent,
  });

  return {
    captureException: (error, metadata) =>
      client.captureException(error, toPostHogExceptionProperties(metadata)),
    capturePageview: (path) =>
      client.capture('$pageview', {
        $current_url: buildPageviewUrl(globalThis.location?.origin ?? '', config.basePath, path),
      }),
    captureEvent: (name, properties) => client.capture(name, properties),
    identify: (userId) => client.identify(userId),
    reset: () => client.reset(),
    register: (context) => client.register({ ...context }),
    isFeatureEnabled: (key) => client.isFeatureEnabled(key) ?? false,
    onFeatureFlags: (callback) => client.onFeatureFlags(callback),
  };
}
