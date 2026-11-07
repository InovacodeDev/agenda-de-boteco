import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './ConfirmDialog';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(
    <ConfirmDialog
      visible
      title="Excluir evento?"
      message="Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('Regra de negócio: diálogo de confirmação', () => {
  it('confirma só pelo botão de confirmar', async () => {
    const { onConfirm, onCancel } = await renderDialog();

    await fireEvent.press(screen.getByText('Excluir'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('mostra título e mensagem', async () => {
    await renderDialog();

    expect(screen.getByText('Excluir evento?')).toBeTruthy();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeTruthy();
  });
});

describe('Tratamento de erro: diálogo de confirmação', () => {
  it('cancelar não confirma', async () => {
    const { onConfirm, onCancel } = await renderDialog();

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ocupado bloqueia confirmar e cancelar', async () => {
    const { onConfirm, onCancel } = await renderDialog({ busy: true });

    for (const button of screen.getAllByRole('button')) {
      await fireEvent.press(button);
    }

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
