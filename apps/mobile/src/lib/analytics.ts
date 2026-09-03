import type { AnalyticsAdapter } from '@agenda/core';
import PostHog from 'posthog-react-native';

/** `PostHogEventProperties` não é reexportado pelo pacote — deriva do próprio método. */
type CaptureProperties = Parameters<InstanceType<typeof PostHog>['capture']>[1];

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

  const posthog = new PostHog(key, { host });

  return {
    capturePageview: (path) => posthog.screen(path),
    // `AnalyticsAdapter.captureEvent` aceita `Record<string, unknown>` (contrato
    // agnóstico do core); o PostHog RN exige JSON estrito. `properties` já é
    // sempre metadado plano (ids/contagens/booleans) por regra do AGENTS.md.
    captureEvent: (name, properties) =>
      posthog.capture(name, properties as CaptureProperties),
    identify: (userId) => posthog.identify(userId),
    reset: () => posthog.reset(),
    isFeatureEnabled: (key) => posthog.isFeatureEnabled(key) ?? false,
    onFeatureFlags: (callback) => posthog.onFeatureFlags(() => callback()),
  };
}
