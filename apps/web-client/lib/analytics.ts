import type { AnalyticsAdapter } from '@agenda/core';
import posthog from 'posthog-js';

/**
 * Adapter concreto de `AnalyticsAdapter` para o painel — mesmo padrão de
 * `lib/supabase.ts` (lê env só aqui, memoiza via singleton do próprio SDK).
 * `capture_pageview: false` porque o pageview é disparado manualmente por rota
 * (App Router não tem evento de navegação nativo que o PostHog capture sozinho).
 */
export function initAnalytics(): AnalyticsAdapter | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key) return null;

  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    person_profiles: 'identified_only',
  });

  return {
    capturePageview: (path) => posthog.capture('$pageview', { $current_url: path }),
    captureEvent: (name, properties) => posthog.capture(name, properties),
    identify: (userId) => posthog.identify(userId),
    reset: () => posthog.reset(),
    isFeatureEnabled: (key) => posthog.isFeatureEnabled(key) ?? false,
    onFeatureFlags: (callback) => posthog.onFeatureFlags(callback),
  };
}
