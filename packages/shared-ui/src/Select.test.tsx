import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { Select } from './Select';

function Controlled({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Select
      id="estilo"
      value={value}
      placeholder="Escolha"
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    >
      <Select.Option value="">Nenhum</Select.Option>
      <Select.Option value="samba">Samba</Select.Option>
      <Select.Option value="rock">Rock</Select.Option>
    </Select>
  );
}

describe('Regra de negócio: Select', () => {
  it('emite o valor escolhido', async () => {
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Samba' }));

    expect(onChange).toHaveBeenCalledWith('samba');
    expect(screen.getByRole('combobox')).toHaveTextContent('Samba');
  });
});

describe('Tratamento de erro: Select', () => {
  it('converte a opção vazia de volta para string vazia', async () => {
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Samba' }));
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Nenhum' }));

    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
