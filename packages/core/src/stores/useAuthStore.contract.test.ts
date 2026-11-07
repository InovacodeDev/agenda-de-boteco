import { useAuthStore } from './useAuthStore';

const mockIsAuthAvailable = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockOnAuthUserChange = jest.fn();
const mockRequestAccountDeletion = jest.fn();

jest.mock('../services/auth', () => ({
  isAuthAvailable: () => mockIsAuthAvailable(),
  getCurrentUser: () => mockGetCurrentUser(),
  onAuthUserChange: (cb: (user: unknown) => void) => mockOnAuthUserChange(cb),
  signOut: jest.fn(),
  requestAccountDeletion: () => mockRequestAccountDeletion(),
}));

const USER = { id: 'u1', email: 'pessoa@example.com', name: 'Pessoa' };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: USER, status: 'signedIn' });
});

describe('Regra de negócio: exclusão de conta pela store de auth', () => {
  it('chama o service uma vez e desloga', async () => {
    mockRequestAccountDeletion.mockResolvedValue(undefined);

    await useAuthStore.getState().requestAccountDeletion();

    expect(mockRequestAccountDeletion).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'signedOut' });
  });
});

describe('Tratamento de erro: falhas do service de auth', () => {
  it('mantém a sessão quando a exclusão falha', async () => {
    const failure = new Error('rede');
    mockRequestAccountDeletion.mockRejectedValue(failure);

    await expect(useAuthStore.getState().requestAccountDeletion()).rejects.toBe(failure);

    expect(useAuthStore.getState()).toMatchObject({ user: USER, status: 'signedIn' });
  });

  it('propaga falha ao carregar o usuário na inicialização', async () => {
    const failure = new Error('rede');
    mockIsAuthAvailable.mockReturnValue(true);
    mockGetCurrentUser.mockRejectedValue(failure);

    await expect(useAuthStore.getState().initialize()).rejects.toBe(failure);
    expect(mockOnAuthUserChange).not.toHaveBeenCalled();
  });
});
