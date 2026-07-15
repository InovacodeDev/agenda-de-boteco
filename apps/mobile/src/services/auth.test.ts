import { AuthUnavailableError } from '@agenda/core';

import { handleDeepLink, signInWithProvider } from './auth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'agenda-de-boteco://'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'dismissed' }),
}));

const mockGetSupabase = jest.fn();

jest.mock('@agenda/core', () => {
  class AuthUnavailableError extends Error {
    constructor() {
      super('Auth indisponível: Supabase não configurado');
      this.name = 'AuthUnavailableError';
    }
  }

  /** Reproduz o parser puro de @agenda/core para os testes de deep link. */
  function parseAuthTokensFromUrl(url: string) {
    const hashIndex = url.indexOf('#');
    const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
    const queryIndex = url.indexOf('?');
    const query =
      queryIndex >= 0
        ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
        : '';
    const fragmentParams = new URLSearchParams(fragment);
    const queryParams = new URLSearchParams(query);
    const accessToken =
      fragmentParams.get('access_token') ?? queryParams.get('access_token');
    const refreshToken =
      fragmentParams.get('refresh_token') ?? queryParams.get('refresh_token');
    if (!accessToken || !refreshToken) {
      return null;
    }
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  return {
    AuthUnavailableError,
    getConfiguredSupabase: () => mockGetSupabase(),
    parseAuthTokensFromUrl,
    handleServiceError: (error: unknown) => {
      throw error;
    },
    logErrorToTerminal: jest.fn(),
  };
});

interface MockAuth {
  signInWithOAuth: jest.Mock;
  setSession: jest.Mock;
}

function makeClient(overrides: Partial<MockAuth> = {}) {
  const auth: MockAuth = {
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: 'https://oauth.url' }, error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { auth };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signInWithProvider', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithProvider('google')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama signInWithOAuth com provider e redirect', async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: { url: 'https://oauth.url' }, error: null });
    const client = makeClient({ signInWithOAuth });
    mockGetSupabase.mockReturnValue(client);
    await signInWithProvider('google');
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'agenda-de-boteco://',
        skipBrowserRedirect: true,
      },
    });
  });
});

describe('handleDeepLink', () => {
  it('retorna false sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    const result = await handleDeepLink('agenda-de-boteco://login#access_token=1&refresh_token=2');
    expect(result).toBe(false);
  });

  it('retorna false para URLs sem tokens', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    const result = await handleDeepLink('agenda-de-boteco://login');
    expect(result).toBe(false);
  });

  it('chama setSession e retorna true com tokens validos', async () => {
    const setSession = jest.fn().mockResolvedValue({ error: null });
    const client = makeClient({ setSession });
    mockGetSupabase.mockReturnValue(client);
    const result = await handleDeepLink('agenda-de-boteco://login#access_token=abc&refresh_token=def');
    expect(setSession).toHaveBeenCalledWith({ access_token: 'abc', refresh_token: 'def' });
    expect(result).toBe(true);
  });

  it('retorna false se setSession falhar', async () => {
    const setSession = jest.fn().mockResolvedValue({ error: new Error('session error') });
    const client = makeClient({ setSession });
    mockGetSupabase.mockReturnValue(client);
    const result = await handleDeepLink('agenda-de-boteco://login#access_token=abc&refresh_token=def');
    expect(result).toBe(false);
  });
});
