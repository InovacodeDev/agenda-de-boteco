import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteErrorFallback } from './RouteErrorFallback';

describe('Regra de negócio: RouteErrorFallback', () => {
  it('mostra a mensagem em pt-BR e chama onRetry ao clicar', async () => {
    const onRetry = jest.fn();
    render(<RouteErrorFallback onRetry={onRetry} />);

    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeTruthy();
    expect(
      screen.getByText('Tivemos um problema ao carregar esta página. Tente novamente.'),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: RouteErrorFallback', () => {
  it('não propaga exceção de onRetry para fora do render', () => {
    const onRetry = jest.fn(() => {
      throw new Error('falha ao tentar novamente');
    });

    expect(() => render(<RouteErrorFallback onRetry={onRetry} />)).not.toThrow();
    expect(onRetry).not.toHaveBeenCalled();
  });
});
