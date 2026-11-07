import { DEFAULT_NOTIFICATION_PREFERENCES, useAuthStore } from '@agenda/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NotificationsSection } from './NotificationsSection';

const mockGetPreferences = jest.fn();
const mockSavePreferences = jest.fn();
const mockEnablePush = jest.fn();
const mockDisablePush = jest.fn();

jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  getNotificationPreferences: () => mockGetPreferences(),
  saveNotificationPreferences: (next: unknown) => mockSavePreferences(next),
}));
jest.mock('@/lib/push', () => ({
  enablePush: () => mockEnablePush(),
  disablePush: () => mockDisablePush(),
}));

const PREFS = { ...DEFAULT_NOTIFICATION_PREFERENCES, channelEmail: false, channelPush: false };

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

async function renderLoaded() {
  await render(<NotificationsSection />, { wrapper: createWrapper() });
  await waitFor(() =>
    expect(screen.getAllByRole('switch')[1].props.accessibilityState).toMatchObject({
      checked: false,
    }),
  );
  const [email, push] = screen.getAllByRole('switch');
  return { email, push };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: { id: 'u1', email: 'dono@example.com', name: 'Dono' },
    status: 'signedIn',
  });
  mockGetPreferences.mockResolvedValue(PREFS);
});

describe('Regra de negócio: preferências de notificação do dono', () => {
  it('ligar e-mail salva as preferências com o novo valor', async () => {
    mockSavePreferences.mockResolvedValue(undefined);
    const { email } = await renderLoaded();

    await fireEvent.press(email);

    await waitFor(() =>
      expect(mockSavePreferences).toHaveBeenCalledWith({ ...PREFS, channelEmail: true }),
    );
  });

  it('ligar push registra o aparelho antes de salvar', async () => {
    mockEnablePush.mockResolvedValue('registered');
    mockSavePreferences.mockResolvedValue(undefined);
    const { push } = await renderLoaded();

    await fireEvent.press(push);

    await waitFor(() =>
      expect(mockSavePreferences).toHaveBeenCalledWith({ ...PREFS, channelPush: true }),
    );
    expect(mockEnablePush).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: preferências de notificação do dono', () => {
  it('falha ao salvar mostra mensagem amigável e reverte o switch', async () => {
    mockSavePreferences.mockRejectedValue(new TypeError('Network request failed'));
    const { email } = await renderLoaded();

    await fireEvent.press(email);

    expect(
      await screen.findByText(
        'Servidor fora do ar ou sem conexão com a internet. Verifique sua conexão e tente novamente.',
      ),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByRole('switch')[0].props.accessibilityState).toMatchObject({
        checked: false,
      }),
    );
  });

  it('push negado no aparelho avisa e não salva', async () => {
    mockEnablePush.mockResolvedValue('denied');
    const { push } = await renderLoaded();

    await fireEvent.press(push);

    expect(
      await screen.findByText(
        'Permita as notificações do app nos ajustes do aparelho para receber alertas push.',
      ),
    ).toBeTruthy();
    expect(mockSavePreferences).not.toHaveBeenCalled();
  });
});
