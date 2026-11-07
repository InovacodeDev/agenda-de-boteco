import { useAuthStore } from '@agenda/core';
import { render, screen, waitFor } from '@testing-library/react-native';

import PainelLayout from './_layout';

const mockReplace = jest.fn();
const mockIsOwner = jest.fn();
const mockOwnedId = jest.fn();

jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const Slot = () => <RNText>PAINEL</RNText>;
  const Tabs = Object.assign(() => <RNText>PAINEL</RNText>, { Screen: () => null });
  return {
    Slot,
    Tabs,
    usePathname: () => '/',
    useRouter: () => ({ replace: mockReplace }),
  };
});

jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  isCurrentUserEstablishmentOwner: () => mockIsOwner(),
  getOwnedEstablishmentId: () => mockOwnedId(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/PanelSidebar', () => ({ PanelSidebar: () => null }));
jest.mock('@/components/PanelTabBar', () => ({ PanelTabBar: () => null }));
jest.mock('@/components/PanelTopbar', () => ({ PanelTopbar: () => null }));
jest.mock('@/hooks/usePanelFlags', () => ({
  isBlockedPanelRoute: () => false,
  usePanelFlags: () => ({}),
}));
jest.mock('@/hooks/useResponsive', () => ({ useResponsive: () => ({ isTablet: true }) }));

const USER = { id: 'u1', email: 'dono@example.com', name: 'Dono' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Regra de negócio: guard do painel do dono', () => {
  it('dono com bar vinculado vê o painel', async () => {
    useAuthStore.setState({ user: USER, status: 'signedIn' });
    mockIsOwner.mockResolvedValue(true);
    mockOwnedId.mockResolvedValue('bar-1');

    await render(<PainelLayout />);

    expect(await screen.findByText('PAINEL')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('Tratamento de erro: guard do painel do dono', () => {
  it.each(['signedOut', 'unavailable'] as const)('status %s vai para o login', async (status) => {
    useAuthStore.setState({ user: null, status });

    await render(<PainelLayout />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('PAINEL')).toBeNull();
  });

  it('conta que não é dona vai para o login', async () => {
    useAuthStore.setState({ user: USER, status: 'signedIn' });
    mockIsOwner.mockResolvedValue(false);

    await render(<PainelLayout />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockOwnedId).not.toHaveBeenCalled();
  });

  it('dono sem bar vinculado vai para o onboarding', async () => {
    useAuthStore.setState({ user: USER, status: 'signedIn' });
    mockIsOwner.mockResolvedValue(true);
    mockOwnedId.mockResolvedValue(null);

    await render(<PainelLayout />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
    expect(screen.queryByText('PAINEL')).toBeNull();
  });

  it('sessão carregando não redireciona nem mostra o painel', async () => {
    useAuthStore.setState({ user: null, status: 'loading' });

    await render(<PainelLayout />);

    expect(screen.getByText('Carregando painel…')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockIsOwner).not.toHaveBeenCalled();
  });
});
