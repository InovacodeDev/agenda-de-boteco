import { AuthUnavailableError } from '@agenda/core';

import { handleDeepLink, signInWithProvider } from './auth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'agenda-de-boteco://'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'dismissed' }),
}));

const mockAppleSignIn = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignIn(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
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
  signInWithIdToken: jest.Mock;
  updateUser: jest.Mock;
}

function makeClient(overrides: Partial<MockAuth> = {}) {
  const auth: MockAuth = {
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: 'https://oauth.url' }, error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
    signInWithIdToken: jest.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn().mockResolvedValue({ error: null }),
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

describe('signInWithProvider — Apple nativo (iOS)', () => {
  it('troca o identityToken por sessão via signInWithIdToken, sem abrir browser', async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({ data: {}, error: null });
    const signInWithOAuth = jest.fn();
    const client = makeClient({ signInWithIdToken, signInWithOAuth });
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({ identityToken: 'apple.jwt', fullName: null });

    await signInWithProvider('apple');

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple.jwt',
    });
    // O loop da App Review vinha do fluxo por browser — ele não deve rodar.
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('grava o nome completo no metadata quando a Apple o envia', async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const client = makeClient({ updateUser });
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({
      identityToken: 'apple.jwt',
      fullName: { givenName: 'Tito', familyName: 'Motter' },
    });

    await signInWithProvider('apple');

    expect(updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Tito Motter', given_name: 'Tito', family_name: 'Motter' },
    });
  });

  it('não chama updateUser quando a Apple não envia nome', async () => {
    const updateUser = jest.fn();
    const client = makeClient({ updateUser });
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({ identityToken: 'apple.jwt', fullName: null });

    await signInWithProvider('apple');

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('trata cancelamento do usuário como no-op, sem propagar erro', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    const canceled: Error & { code?: string } = new Error('canceled');
    canceled.code = 'ERR_REQUEST_CANCELED';
    mockAppleSignIn.mockRejectedValue(canceled);

    await expect(signInWithProvider('apple')).resolves.toBeUndefined();
    expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('propaga erro quando a Apple não devolve identityToken', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({ identityToken: null, fullName: null });

    await expect(signInWithProvider('apple')).rejects.toThrow(/token de identidade/);
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
