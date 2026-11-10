import { createPostHogBrowserAdapter, type PostHogBrowserClient } from './analytics';

function makeClient(): jest.Mocked<PostHogBrowserClient> {
  return {
    init: jest.fn(),
    capture: jest.fn(),
    captureException: jest.fn(),
    register: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(),
    onFeatureFlags: jest.fn(),
  };
}

function initConfig(client: jest.Mocked<PostHogBrowserClient>): Record<string, unknown> {
  return client.init.mock.calls[0]?.[1] ?? {};
}

describe('Regra de negócio: ui_host no init do posthog-js', () => {
  it('repassa uiHost como ui_host junto do api_host do proxy', () => {
    const client = makeClient();
    createPostHogBrowserAdapter(client, {
      apiKey: 'key',
      apiHost: '/client/ingest',
      uiHost: 'https://us.posthog.com',
    });

    expect(initConfig(client)).toEqual(
      expect.objectContaining({ api_host: '/client/ingest', ui_host: 'https://us.posthog.com' }),
    );
  });
});

describe('Tratamento de erro: uiHost ausente', () => {
  it('não inclui a chave ui_host quando uiHost é undefined', () => {
    const client = makeClient();
    createPostHogBrowserAdapter(client, { apiKey: 'key', apiHost: '/ingest' });

    expect(initConfig(client)).not.toHaveProperty('ui_host');
  });
});
