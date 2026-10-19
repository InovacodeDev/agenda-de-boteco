import type { AnalyticsAdapter } from '@agenda/core';
import PostHog from 'posthog-react-native';

/** `PostHogEventProperties` não é reexportado pelo pacote — deriva do próprio método. */
type CaptureProperties = Parameters<InstanceType<typeof PostHog>['capture']>[1];

/**
 * Adapter de `AnalyticsAdapter` sobre `posthog-react-native`, cópia do de
 * `apps/mobile`. Aponta para o mesmo projeto PostHog do web-client (mesma
 * key), então as flags `panel-*` liberam/bloqueiam as telas nos dois painéis
 * ao mesmo tempo.
 */
export function initAnalytics(): AnalyticsAdapter | null {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!key) return null;

  const posthog = new PostHog(key, { host });

  return {
    capturePageview: (path) => posthog.screen(path),
    captureEvent: (name, properties) =>
      posthog.capture(name, properties as CaptureProperties),
    identify: (userId) => posthog.identify(userId),
    reset: () => posthog.reset(),
    isFeatureEnabled: (key) => posthog.isFeatureEnabled(key) ?? false,
    onFeatureFlags: (callback) => posthog.onFeatureFlags(() => callback()),
  };
}
