import {
  type AnalyticsAdapter,
  buildPostHogNativeOptions,
  createPostHogNativeAdapter,
} from '@agenda/core';
import PostHog from 'posthog-react-native';

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

  return createPostHogNativeAdapter(
    new PostHog(key, buildPostHogNativeOptions({ host, nativeCrashes: true })),
  );
}
