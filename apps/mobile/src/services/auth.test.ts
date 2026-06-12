import {
  AuthUnavailableError,
  getCurrentUser,
  handleDeepLink,
  isAuthAvailable,
  onAuthUserChange,
  signInWithEmailOtp,
  signInWithProvider,
  signOut,
  verifyEmailOtp,
} from './auth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'agenda-de-boteco://'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'dismissed' }),
}));

const mockGetSupabase = jest.fn();
jest.mock('../lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

interface MockAuth {
  signInWithOtp: jest.Mock;
  signOut: jest.Mock;
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  signInWithOAuth: jest.Mock;
  setSession: jest.Mock;
  verifyOtp: jest.Mock;
}

function makeClient(overrides: Partial<MockAuth> = {}) {
  const auth: MockAuth = {
    signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: 'https://oauth.url' }, error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
    verifyOtp: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { auth };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isAuthAvailable', () => {
  it('reflete a configuração do Supabase', () => {
    mockGetSupabase.mockReturnValue(null);
    expect(isAuthAvailable()).toBe(false);
    mockGetSupabase.mockReturnValue(makeClient());
    expect(isAuthAvailable()).toBe(true);
  });
});

describe('signInWithEmailOtp', () => {
  it('lança AuthUnavailableError sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithEmailOtp('a@b.com')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama signInWithOtp com e-mail e redirect', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signInWithEmailOtp('tito@exemplo.com');
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'tito@exemplo.com',
      options: { emailRedirectTo: 'agenda-de-boteco://' },
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      signInWithOtp: jest.fn().mockResolvedValue({ error: new Error('boom') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(signInWithEmailOtp('a@b.com')).rejects.toThrow('boom');
  });
});

describe('signOut', () => {
  it('é no-op sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('chama signOut do client', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signOut();
    expect(client.auth.signOut).toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('retorna null sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('mapeia o usuário da sessão (id, email, name de user_metadata)', async () => {
    const client = makeClient({
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'u1',
              email: 'tito@exemplo.com',
              user_metadata: { full_name: 'Tito' },
            },
          },
        },
      }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(getCurrentUser()).resolves.toEqual({
      id: 'u1',
      email: 'tito@exemplo.com',
      name: 'Tito',
    });
  });

  it('retorna null sem sessão ativa', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('onAuthUserChange', () => {
  it('retorna unsubscribe inerte sem Supabase configurado', () => {
    mockGetSupabase.mockReturnValue(null);
    const unsubscribe = onAuthUserChange(jest.fn());
    expect(unsubscribe()).toBeUndefined();
  });

  it('notifica com usuário mapeado e desinscreve', () => {
    const unsubscribeFn = jest.fn();
    let handler: (event: string, session: unknown) => void = () => undefined;
    const client = makeClient({
      onAuthStateChange: jest.fn((cb: typeof handler) => {
        handler = cb;
        return { data: { subscription: { unsubscribe: unsubscribeFn } } };
      }),
    });
    mockGetSupabase.mockReturnValue(client);

    const callback = jest.fn();
    const unsubscribe = onAuthUserChange(callback);

    handler('SIGNED_IN', {
      user: { id: 'u2', email: null, user_metadata: {} },
    });
    expect(callback).toHaveBeenCalledWith({ id: 'u2', email: null, name: null });

    handler('SIGNED_OUT', null);
    expect(callback).toHaveBeenCalledWith(null);

    unsubscribe();
    expect(unsubscribeFn).toHaveBeenCalled();
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

describe('verifyEmailOtp', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(verifyEmailOtp('tito@exemplo.com', '123456')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama verifyOtp com email, token e type: email', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ error: null });
    const client = makeClient({ verifyOtp });
    mockGetSupabase.mockReturnValue(client);
    await verifyEmailOtp('tito@exemplo.com', '123456');
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'tito@exemplo.com',
      token: '123456',
      type: 'email',
    });
  });

  it('propaga erro do Supabase', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ error: new Error('invalid token') });
    const client = makeClient({ verifyOtp });
    mockGetSupabase.mockReturnValue(client);
    await expect(verifyEmailOtp('tito@exemplo.com', '123456')).rejects.toThrow('invalid token');
  });
});
