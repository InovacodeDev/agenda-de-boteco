import { useAuthStore } from './useAuthStore';

const mockIsAuthAvailable = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockOnAuthUserChange = jest.fn();

jest.mock('../services/auth', () => ({
  isAuthAvailable: () => mockIsAuthAvailable(),
  getCurrentUser: () => mockGetCurrentUser(),
  onAuthUserChange: (cb: (user: unknown) => void) => mockOnAuthUserChange(cb),
  signOut: jest.fn(),
  requestAccountDeletion: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: null, status: 'loading' });
});

describe('Regra de negócio: inicialização da store de auth', () => {
  it('marca status unavailable quando Supabase não está configurado', async () => {
    mockIsAuthAvailable.mockReturnValue(false);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'unavailable' });
  });
});

describe('Tratamento de erro: falha ao carregar sessão inicial não trava em loading', () => {
  it('cai para signedOut quando getCurrentUser rejeita', async () => {
    const failure = new Error('rede');
    mockIsAuthAvailable.mockReturnValue(true);
    mockGetCurrentUser.mockRejectedValue(failure);

    await expect(useAuthStore.getState().initialize()).rejects.toBe(failure);

    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'signedOut' });
  });
});
