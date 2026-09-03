import type { AnalyticsAdapter } from '@agenda/core';
import posthog from 'posthog-js';

/**
 * Adapter concreto de `AnalyticsAdapter` sobre `posthog-js`. Pageview é manual
 * (`capture_pageview: false`) porque o App Router não dispara load completo por
 * rota — quem chama `capturePageview` é o `PostHogPageview` em `providers.tsx`.
 * Sem `NEXT_PUBLIC_POSTHOG_KEY`, retorna null e o core degrada para no-op.
 */
export function initAnalytics(): AnalyticsAdapter | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    person_profiles: 'identified_only',
  });

  return {
    capturePageview(path) {
      posthog.capture('$pageview', { $current_url: path });
    },
    captureEvent(name, properties) {
      posthog.capture(name, properties);
    },
    identify(userId) {
      posthog.identify(userId);
    },
    reset() {
      posthog.reset();
    },
    isFeatureEnabled(key) {
      return posthog.isFeatureEnabled(key) ?? false;
    },
    onFeatureFlags(callback) {
      return posthog.onFeatureFlags(callback);
    },
  };
}
