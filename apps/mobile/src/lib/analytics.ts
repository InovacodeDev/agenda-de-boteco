import {
  type AnalyticsAdapter,
  buildPostHogNativeOptions,
  createPostHogNativeAdapter,
} from '@agenda/core';
import PostHog from 'posthog-react-native';

/**
 * Adapter concreto de `AnalyticsAdapter` sobre `posthog-react-native`. Mesma
 * fachada usada nos 5 apps Next (ver `apps/web/lib/analytics.ts`), trocando
 * só o SDK — aqui não há "página" HTTP, `capturePageview` mapeia para
 * `posthog.screen`, o equivalente de tela do PostHog mobile.
 */
export function initAnalytics(): AnalyticsAdapter | null {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!key) return null;

  return createPostHogNativeAdapter(
    new PostHog(key, buildPostHogNativeOptions({ host, nativeCrashes: true })),
  );
}
