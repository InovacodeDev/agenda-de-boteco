import { render, screen, waitFor } from '@testing-library/react-native';

import { AccountSection } from './AccountSection';

const mockGetProvider = jest.fn();

jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  getUserAuthProvider: () => mockGetProvider(),
}));

describe('Regra de negócio: provedor de login na conta do dono', () => {
  it('mostra o selo da Apple e esconde o formulário de senha', async () => {
    mockGetProvider.mockResolvedValue('apple');
    await render(<AccountSection onSuccessNotice={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Conectado com Apple')).toBeTruthy());
    expect(screen.queryByText('Alterar senha')).toBeNull();
  });

  it('mantém o formulário de senha para conta com e-mail', async () => {
    mockGetProvider.mockResolvedValue('email');
    await render(<AccountSection onSuccessNotice={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('E-mail e Senha')).toBeTruthy());
    expect(screen.getByText('Alterar senha')).toBeTruthy();
  });
});

describe('Tratamento de erro: provedor de login na conta do dono', () => {
  it('trata provedor não identificado como conta com e-mail', async () => {
    mockGetProvider.mockResolvedValue(null);
    await render(<AccountSection onSuccessNotice={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('E-mail e Senha')).toBeTruthy());
    expect(screen.getByText('Alterar senha')).toBeTruthy();
  });
});
