import { useAuthStore } from './useAuthStore';

const mockIsAuthAvailable = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockOnAuthUserChange = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../services/auth', () => ({
  isAuthAvailable: () => mockIsAuthAvailable(),
  getCurrentUser: () => mockGetCurrentUser(),
  onAuthUserChange: (cb: (user: unknown) => void) => mockOnAuthUserChange(cb),
  signOut: () => mockSignOut(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: null, status: 'loading' });
});

describe('useAuthStore.initialize', () => {
  it('marca unavailable quando o Supabase não está configurado', async () => {
    mockIsAuthAvailable.mockReturnValue(false);
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('unavailable');
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('carrega usuário existente e fica signedIn', async () => {
    const user = { id: 'u1', email: 'a@b.com', name: 'Tito' };
    mockIsAuthAvailable.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValue(user);
    mockOnAuthUserChange.mockReturnValue(() => undefined);

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('fica signedOut sem sessão e reage a mudanças de auth', async () => {
    mockIsAuthAvailable.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValue(null);
    let authCallback: (user: unknown) => void = () => undefined;
    mockOnAuthUserChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb;
      return () => undefined;
    });

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('signedOut');

    const user = { id: 'u2', email: null, name: null };
    authCallback(user);
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().user).toEqual(user);

    authCallback(null);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});

describe('useAuthStore.signOut', () => {
  it('chama o service e limpa o estado', async () => {
    mockSignOut.mockResolvedValue(undefined);
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', name: null },
      status: 'signedIn',
    });

    await useAuthStore.getState().signOut();
    expect(mockSignOut).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });
});
