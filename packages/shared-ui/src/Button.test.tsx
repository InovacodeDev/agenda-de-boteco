import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './Button';
import { PageHeader } from './PageHeader';
import { BTN_DANGER } from './styles';

describe('Regra de negócio: botões compartilhados', () => {
  it('dispara onClick e não submete formulário por padrão', async () => {
    const onClick = jest.fn();
    const onSubmit = jest.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button onClick={onClick}>Salvar</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('aplica a variante pedida', () => {
    render(<Button variant="danger">Excluir</Button>);

    expect(screen.getByRole('button', { name: 'Excluir' }).className).toContain(BTN_DANGER);
  });

  it('PageHeader mostra o título e aciona "Novo"', async () => {
    const onNew = jest.fn();
    render(<PageHeader title="Eventos" onNew={onNew} />);

    await userEvent.click(screen.getByRole('button', { name: '+ Novo' }));

    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument();
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: botões compartilhados', () => {
  it('botão desabilitado não dispara onClick', async () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
