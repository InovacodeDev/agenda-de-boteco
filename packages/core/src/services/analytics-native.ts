/**
 * Adapter de `AnalyticsAdapter` para `posthog-react-native`. Mesmo motivo de
 * `createPostHogBrowserAdapter`: o SDK nativo não pode ser dependência do core,
 * então o app injeta a instância e o core só conhece o contrato estrutural.
 * Métodos declarados com sintaxe de método (bivariância) para a instância
 * `PostHog` ser atribuível sem cast.
 */
import { sanitizeCaptureEvent } from '../utils/error-reporting';
import {
  type AnalyticsAdapter,
  type AnalyticsContextRegistrar,
  toPostHogExceptionProperties,
} from './analytics';

export interface PostHogNativeClient {
  capture(event: string, properties?: Record<string, unknown>): void;
  screen(name: string): void | Promise<void>;
  identify(distinctId: string): void;
  reset(): void;
  isFeatureEnabled(key: string): boolean | undefined;
  onFeatureFlags(callback: () => void): () => void;
  captureException(error: unknown, properties?: Record<string, unknown>): void;
  register(properties: Record<string, unknown>): void | Promise<void>;
}

export function buildPostHogNativeOptions(input: { host?: string; nativeCrashes: boolean }): {
  host?: string;
  personProfiles: 'identified_only';
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true;
      unhandledRejections: true;
      console: false;
      nativeCrashes: boolean;
    };
  };
  before_send: typeof sanitizeCaptureEvent;
} {
  return {
    host: input.host,
    personProfiles: 'identified_only',
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
        console: false,
        nativeCrashes: input.nativeCrashes,
      },
    },
    before_send: sanitizeCaptureEvent,
  };
}

export function createPostHogNativeAdapter(
  client: PostHogNativeClient,
): AnalyticsAdapter & AnalyticsContextRegistrar {
  return {
    captureException: (error, metadata) =>
      client.captureException(error, toPostHogExceptionProperties(metadata)),
    capturePageview: (path) => {
      void client.screen(path);
    },
    captureEvent: (name, properties) => client.capture(name, properties),
    identify: (userId) => client.identify(userId),
    reset: () => client.reset(),
    register: (context) => {
      void client.register({ ...context });
    },
    isFeatureEnabled: (key) => client.isFeatureEnabled(key) ?? false,
    onFeatureFlags: (callback) => client.onFeatureFlags(callback),
  };
}
