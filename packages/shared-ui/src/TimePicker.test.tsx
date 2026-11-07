import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

describe('Regra de negócio: seletores de data e hora', () => {
  it('TimePicker emite HH:MM em passos de 30 minutos por padrão', async () => {
    const onValueChange = jest.fn();
    render(<TimePicker value="" onValueChange={onValueChange} ariaLabel="Início" />);

    await userEvent.click(screen.getByRole('button', { name: 'Início' }));
    const options = await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ });
    await userEvent.click(screen.getByRole('button', { name: '22:30' }));

    expect(options).toHaveLength(48);
    expect(onValueChange).toHaveBeenCalledWith('22:30');
  });

  it('TimePicker respeita stepMinutes', async () => {
    render(<TimePicker value="" onValueChange={jest.fn()} ariaLabel="Início" stepMinutes={60} />);

    await userEvent.click(screen.getByRole('button', { name: 'Início' }));

    expect(await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ })).toHaveLength(24);
  });

  it('DatePicker mostra a data em pt-BR e emite YYYY-MM-DD', async () => {
    const onValueChange = jest.fn();
    render(<DatePicker value="2026-11-07" onValueChange={onValueChange} ariaLabel="Data" />);

    const trigger = screen.getByRole('button', { name: 'Data' });
    expect(trigger).toHaveTextContent('07/11/2026');
    await userEvent.click(trigger);
    const grid = await screen.findByRole('grid');
    await userEvent.click(within(grid).getByText('20'));

    expect(onValueChange).toHaveBeenCalledWith('2026-11-20');
  });
});

describe('Tratamento de erro: seletores de data e hora', () => {
  it('sem valor mostra o placeholder', () => {
    render(<DatePicker value="" onValueChange={jest.fn()} ariaLabel="Data" placeholder="Escolha" />);

    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('Escolha');
  });

  it('DatePicker não emite data desabilitada', async () => {
    const onValueChange = jest.fn();
    render(
      <DatePicker
        value="2026-11-07"
        onValueChange={onValueChange}
        ariaLabel="Data"
        disabled={(date) => date.getDate() === 20}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Data' }));
    const grid = await screen.findByRole('grid');
    await userEvent.click(within(grid).getByText('20'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
