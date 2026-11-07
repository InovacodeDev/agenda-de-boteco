import { AuthUnavailableError } from '@agenda/core';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { handleAuthDeepLink, signInWithProvider } from './auth';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'agenda-boteco-client://'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

const mockAppleSignIn = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignIn(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const mockGetSupabase = jest.fn();
const mockLogError = jest.fn();

jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  getConfiguredSupabase: () => mockGetSupabase(),
  handleServiceError: (error: unknown) => {
    throw error;
  },
  logErrorToTerminal: (...args: unknown[]) => mockLogError(...args),
}));

const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

interface MockAuth {
  signInWithOAuth: jest.Mock;
  setSession: jest.Mock;
  signInWithIdToken: jest.Mock;
  updateUser: jest.Mock;
}

function makeClient(overrides: Partial<MockAuth> = {}) {
  const auth: MockAuth = {
    signInWithOAuth: jest
      .fn()
      .mockResolvedValue({ data: { url: 'https://oauth.url' }, error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
    signInWithIdToken: jest.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return { auth };
}

const CALLBACK = 'agenda-boteco-client://#access_token=at&refresh_token=rt';

beforeEach(() => {
  jest.clearAllMocks();
  openAuthSession.mockResolvedValue({ type: 'dismissed' });
  Platform.OS = 'ios';
});

describe('signInWithProvider — Google', () => {
  it('lança AuthUnavailableError sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(signInWithProvider('google')).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('pede a URL sem redirect do browser e abre a sessão de autenticação', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await signInWithProvider('google');

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'agenda-boteco-client://', skipBrowserRedirect: true },
    });
    expect(openAuthSession).toHaveBeenCalledWith('https://oauth.url', 'agenda-boteco-client://');
  });

  it('cancelamento do browser não grava sessão nem lança', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    openAuthSession.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithProvider('google')).resolves.toBeUndefined();
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it('grava a sessão com os tokens do callback', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    openAuthSession.mockResolvedValue({ type: 'success', url: CALLBACK });

    await signInWithProvider('google');

    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('callback sem par completo de tokens não grava sessão', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'agenda-boteco-client://#access_token=at',
    });

    await signInWithProvider('google');
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it('re-lança erro do Supabase', async () => {
    const failure = new Error('oauth falhou');
    const client = makeClient({
      signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: null }, error: failure }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(signInWithProvider('google')).rejects.toBe(failure);
  });
});

describe('signInWithProvider — Apple nativo (iOS)', () => {
  it('troca o identityToken por sessão e grava o nome no primeiro login', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({
      identityToken: 'id-token',
      fullName: { givenName: 'Ana', familyName: 'Souza' },
    });

    await signInWithProvider('apple');

    expect(client.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'id-token',
    });
    expect(client.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Ana Souza', given_name: 'Ana', family_name: 'Souza' },
    });
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it('não atualiza o nome quando a Apple não envia', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockResolvedValue({ identityToken: 'id-token', fullName: null });

    await signInWithProvider('apple');
    expect(client.auth.updateUser).not.toHaveBeenCalled();
  });

  it('cancelamento do modal sai em silêncio', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    mockAppleSignIn.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    await expect(signInWithProvider('apple')).resolves.toBeUndefined();
    expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('lança quando a Apple não devolve identityToken', async () => {
    mockGetSupabase.mockReturnValue(makeClient());
    mockAppleSignIn.mockResolvedValue({ identityToken: null });

    await expect(signInWithProvider('apple')).rejects.toThrow('token de identidade');
  });

  it('no Android, Apple usa o fluxo por browser', async () => {
    Platform.OS = 'android';
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await signInWithProvider('apple');

    expect(mockAppleSignIn).not.toHaveBeenCalled();
    expect(client.auth.signInWithOAuth).toHaveBeenCalled();
  });
});

describe('handleAuthDeepLink', () => {
  it('retorna null sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(handleAuthDeepLink(CALLBACK)).resolves.toBeNull();
  });

  it('retorna null quando a URL não tem tokens', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(handleAuthDeepLink('agenda-boteco-client://login')).resolves.toBeNull();
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it('identifica link de recuperação de senha', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(handleAuthDeepLink(`${CALLBACK}&type=recovery`)).resolves.toBe('recovery');
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('demais links com tokens só gravam a sessão', async () => {
    mockGetSupabase.mockReturnValue(makeClient());
    await expect(handleAuthDeepLink(`${CALLBACK}&type=signup`)).resolves.toBe('session');
  });

  it('token inválido retorna null e não loga a URL', async () => {
    const failure = new Error('invalid token');
    mockGetSupabase.mockReturnValue(
      makeClient({ setSession: jest.fn().mockResolvedValue({ error: failure }) }),
    );

    await expect(handleAuthDeepLink(CALLBACK)).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(failure, {
      method: 'mobileClientAuth.handleAuthDeepLink',
    });
  });
});
