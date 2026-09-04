import * as errors from '../utils/errors';
import {
  AuthUnavailableError,
  configureAuthRedirect,
  getCurrentUser,
  isAuthAvailable,
  onAuthUserChange,
  requestAccountDeletion,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  verifyEmailOtp,
} from './auth';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
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
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  updateUser: jest.Mock;
}

function makeClient(overrides: Partial<MockAuth> = {}, rpc?: jest.Mock) {
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
    signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    updateUser: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { auth, rpc: rpc ?? jest.fn().mockResolvedValue({ data: null, error: null }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  configureAuthRedirect(() => 'agenda-de-boteco://');
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

describe('signInWithOAuth', () => {
  it('lança AuthUnavailableError sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithOAuth('google')).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('usa o redirect configurado, e não a origin nua', async () => {
    configureAuthRedirect(() => 'https://exemplo.com/app');
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signInWithOAuth('google');
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://exemplo.com/app' },
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      signInWithOAuth: jest.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(signInWithOAuth('apple')).rejects.toThrow('boom');
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

describe('signInWithPassword', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithPassword('tito@exemplo.com', 'senha123')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama signInWithPassword com email e senha', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signInWithPassword('tito@exemplo.com', 'senha123');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'tito@exemplo.com',
      password: 'senha123',
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      signInWithPassword: jest.fn().mockResolvedValue({ error: new Error('invalid credentials') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(signInWithPassword('tito@exemplo.com', 'senha123')).rejects.toThrow(
      'invalid credentials',
    );
  });

  it('NÃO inclui a senha no contexto de erro', async () => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    const client = makeClient({
      signInWithPassword: jest.fn().mockResolvedValue({ error: new Error('boom') }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(signInWithPassword('tito@exemplo.com', 'senha-secreta')).rejects.toThrow('boom');

    expect(spy).toHaveBeenCalledWith(expect.any(Error), {
      method: 'auth.signInWithPassword',
      args: { email: 'tito@exemplo.com' },
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('senha-secreta');
    spy.mockRestore();
  });
});

describe('signUpWithPassword', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signUpWithPassword('tito@exemplo.com', 'senha123')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama signUp com email, senha e emailRedirectTo', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signUpWithPassword('tito@exemplo.com', 'senha123');
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'tito@exemplo.com',
      password: 'senha123',
      options: { emailRedirectTo: 'agenda-de-boteco://' },
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      signUp: jest.fn().mockResolvedValue({ error: new Error('user already registered') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(signUpWithPassword('tito@exemplo.com', 'senha123')).rejects.toThrow(
      'user already registered',
    );
  });

  it('NÃO inclui a senha no contexto de erro', async () => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    const client = makeClient({
      signUp: jest.fn().mockResolvedValue({ error: new Error('boom') }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(signUpWithPassword('tito@exemplo.com', 'senha-secreta')).rejects.toThrow('boom');

    expect(spy).toHaveBeenCalledWith(expect.any(Error), {
      method: 'auth.signUpWithPassword',
      args: { email: 'tito@exemplo.com' },
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('senha-secreta');
    spy.mockRestore();
  });
});

describe('sendPasswordReset', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(sendPasswordReset('tito@exemplo.com')).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('chama resetPasswordForEmail com email e redirectTo', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await sendPasswordReset('tito@exemplo.com');
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('tito@exemplo.com', {
      redirectTo: 'agenda-de-boteco://',
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: new Error('rate limit') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(sendPasswordReset('tito@exemplo.com')).rejects.toThrow('rate limit');
  });
});

describe('updatePassword', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(updatePassword('nova-senha')).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('chama updateUser com a nova senha', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await updatePassword('nova-senha');
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'nova-senha' });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      updateUser: jest.fn().mockResolvedValue({ error: new Error('session expired') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(updatePassword('nova-senha')).rejects.toThrow('session expired');
  });

  it('NÃO inclui a senha no contexto de erro', async () => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    const client = makeClient({
      updateUser: jest.fn().mockResolvedValue({ error: new Error('boom') }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(updatePassword('senha-secreta')).rejects.toThrow('boom');

    expect(spy).toHaveBeenCalledWith(expect.any(Error), { method: 'auth.updatePassword' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('senha-secreta');
    spy.mockRestore();
  });
});

describe('signInWithOAuth', () => {
  it('lança AuthUnavailableError sem Supabase', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithOAuth('google')).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('chama signInWithOAuth com provider e redirectTo', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await signInWithOAuth('google');
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'agenda-de-boteco://' },
    });
  });

  it('propaga erro do Supabase', async () => {
    const client = makeClient({
      signInWithOAuth: jest.fn().mockResolvedValue({ error: new Error('provider disabled') }),
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(signInWithOAuth('google')).rejects.toThrow('provider disabled');
  });
});

describe('requestAccountDeletion', () => {
  it('é no-op sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(requestAccountDeletion()).resolves.toBeUndefined();
  });

  it('chama a RPC request_account_deletion e desloga em caso de sucesso', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const client = makeClient({}, rpc);
    mockGetSupabase.mockReturnValue(client);

    await requestAccountDeletion();

    expect(rpc).toHaveBeenCalledWith('request_account_deletion');
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('propaga erro e NÃO desloga quando a RPC falha', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error('not authenticated') });
    const client = makeClient({}, rpc);
    mockGetSupabase.mockReturnValue(client);

    await expect(requestAccountDeletion()).rejects.toThrow('not authenticated');
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
