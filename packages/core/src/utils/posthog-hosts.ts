const UI_HOST_BY_INGEST_HOST: Readonly<Record<string, string>> = {
  'https://us.i.posthog.com': 'https://us.posthog.com',
  'https://eu.i.posthog.com': 'https://eu.posthog.com',
};

/**
 * Com o `api_host` apontando para o proxy first-party, o posthog-js não sabe
 * onde fica a UI do PostHog (toolbar, links de replay). O host de ingestão da
 * região mapeia para o da UI; proxy próprio devolve `undefined`.
 */
export function postHogUiHost(ingestHost: string | undefined): string | undefined {
  if (!ingestHost) return undefined;
  return UI_HOST_BY_INGEST_HOST[ingestHost.trim().replace(/\/+$/, '')];
}
