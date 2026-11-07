import { useAuthStore } from '@agenda/core';
import { AuthError } from '@supabase/supabase-js';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import NewPasswordScreen from './new-password';

const mockReplace = jest.fn();
const mockUpdatePassword = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));
jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  updatePassword: (password: string) => mockUpdatePassword(password),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

async function fillAndSubmit(password: string, confirmation: string) {
  const [first, second] = screen.getAllByPlaceholderText('••••••••');
  await fireEvent.changeText(first, password);
  await fireEvent.changeText(second, confirmation);
  await fireEvent.press(screen.getByText('Atualizar Senha'));
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { id: 'u1', email: 'dono@example.com', name: 'Dono' }, status: 'signedIn' });
});

describe('Regra de negócio: redefinição de senha do dono', () => {
  it('atualiza a senha e volta ao painel após confirmar', async () => {
    mockUpdatePassword.mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[0]?.onPress?.();
    });
    await render(<NewPasswordScreen />);

    await fillAndSubmit('segredo123', 'segredo123');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(painel)'));
    expect(mockUpdatePassword).toHaveBeenCalledWith('segredo123');
    expect(alert).toHaveBeenCalledWith('Sucesso', 'Sua senha foi redefinida.', expect.any(Array));
  });
});

describe('Tratamento de erro: redefinição de senha do dono', () => {
  it('recusa senha com menos de 6 caracteres', async () => {
    await render(<NewPasswordScreen />);

    await fillAndSubmit('12345', '12345');

    expect(screen.getByText('A senha deve ter no mínimo 6 caracteres.')).toBeTruthy();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('recusa confirmação divergente', async () => {
    await render(<NewPasswordScreen />);

    await fillAndSubmit('segredo123', 'segredo124');

    expect(screen.getByText('A confirmação não coincide com a nova senha.')).toBeTruthy();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('mostra mensagem amigável e não o texto cru do erro de auth', async () => {
    mockUpdatePassword.mockRejectedValue(new AuthError('rate limit exceeded for user dono@example.com', 429));
    await render(<NewPasswordScreen />);

    await fillAndSubmit('segredo123', 'segredo123');

    expect(
      await screen.findByText(
        'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/dono@example\.com/)).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('link expirado (sem sessão) avisa e não envia', async () => {
    useAuthStore.setState({ user: null, status: 'signedOut' });
    await render(<NewPasswordScreen />);

    await fillAndSubmit('segredo123', 'segredo123');

    expect(screen.getByText(/Link inválido ou expirado/)).toBeTruthy();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });
});
