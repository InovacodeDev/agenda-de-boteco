import {
  AuthUnavailableError,
  getCurrentUser,
  isAuthAvailable,
  onAuthUserChange,
  signInWithEmailOtp,
  signOut,
} from './auth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'agenda-de-boteco://login'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
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
}

function makeClient(overrides: Partial<MockAuth> = {}) {
  const auth: MockAuth = {
    signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
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
      options: { emailRedirectTo: 'agenda-de-boteco://login' },
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
