import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { Sidebar } from './Sidebar';
import { TOAST_DURATION_MS, type ToastInput, ToastProvider, useToast } from './Toast';

function Trigger({ toasts }: { toasts: ToastInput[] }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => toasts.forEach(show)}>
      disparar
    </button>
  );
}

function renderWithToasts(toasts: ToastInput[]) {
  render(
    <ToastProvider>
      <Trigger toasts={toasts} />
    </ToastProvider>,
  );
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

function SidebarHarness() {
  const [open, setOpen] = useState(true);
  return (
    <Sidebar open={open} onOpenChange={setOpen} title="Filtros">
      <p>conteúdo</p>
    </Sidebar>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Regra de negócio: avisos e painel lateral', () => {
  it('sucesso aparece como status e some após 7s', async () => {
    const user = renderWithToasts([{ tone: 'success', message: 'Evento salvo' }]);

    await user.click(screen.getByRole('button', { name: 'disparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Evento salvo');

    act(() => jest.advanceTimersByTime(TOAST_DURATION_MS.success));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ação do aviso executa e fecha', async () => {
    const onPress = jest.fn();
    const user = renderWithToasts([
      { tone: 'error', message: 'Falhou', action: { label: 'Tentar de novo', onPress } },
    ]);

    await user.click(screen.getByRole('button', { name: 'disparar' }));
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Sidebar mostra título e conteúdo e fecha pelo botão', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SidebarHarness />);

    expect(screen.getByRole('dialog', { name: 'Filtros' })).toHaveTextContent('conteúdo');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Tratamento de erro: avisos', () => {
  it('erro aparece como alert e dura 10s', async () => {
    const user = renderWithToasts([{ tone: 'error', message: 'Falha ao salvar' }]);

    await user.click(screen.getByRole('button', { name: 'disparar' }));
    act(() => jest.advanceTimersByTime(TOAST_DURATION_MS.success));
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar');

    act(() => jest.advanceTimersByTime(TOAST_DURATION_MS.error - TOAST_DURATION_MS.success));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mantém no máximo 3 avisos visíveis', async () => {
    const user = renderWithToasts(
      ['a', 'b', 'c', 'd'].map((message) => ({ tone: 'error' as const, message })),
    );

    await user.click(screen.getByRole('button', { name: 'disparar' }));

    expect(screen.getAllByRole('alert').map((node) => node.textContent)).toEqual(['b', 'c', 'd']);
  });

  it('useToast fora do provider falha com mensagem clara', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function Orphan() {
      useToast();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow('useToast precisa estar dentro de <ToastProvider>');
    spy.mockRestore();
  });
});
