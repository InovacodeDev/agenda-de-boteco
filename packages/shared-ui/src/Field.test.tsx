import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Field } from './Field';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';

describe('Regra de negócio: campos de formulário', () => {
  it('associa o rótulo ao controle', () => {
    render(
      <Field label="Nome do bar">
        <TextInput defaultValue="" />
      </Field>,
    );

    expect(screen.getByLabelText('Nome do bar')).toBeInstanceOf(HTMLInputElement);
  });

  it('formata moeda com prefixo R$ ao digitar', async () => {
    const values: string[] = [];
    render(
      <Field label="Entrada">
        <TextInput type="currency" prefix onChange={(event) => values.push(event.target.value)} />
      </Field>,
    );

    await userEvent.type(screen.getByLabelText('Entrada'), '12345');

    expect(values.at(-1)).toBe('R$ 123,45');
    expect(screen.getByLabelText('Entrada')).toHaveAttribute('inputmode', 'numeric');
  });

  it('TextArea usa 3 linhas por padrão', () => {
    render(
      <Field label="Descrição">
        <TextArea />
      </Field>,
    );

    expect(screen.getByLabelText('Descrição')).toHaveAttribute('rows', '3');
  });
});

describe('Tratamento de erro: campos de formulário', () => {
  it('exibe a mensagem de erro do campo', () => {
    render(
      <Field label="Nome do bar" error="Informe o nome">
        <TextInput />
      </Field>,
    );

    expect(screen.getByText('Informe o nome')).toBeInTheDocument();
  });

  it('não exibe erro quando não há erro', () => {
    render(
      <Field label="Nome do bar">
        <TextInput />
      </Field>,
    );

    expect(screen.queryByText('Informe o nome')).not.toBeInTheDocument();
  });

  it('moeda descarta letras e zeros à esquerda', () => {
    const onChange = jest.fn();
    render(
      <Field label="Entrada">
        <TextInput type="currency" onChange={onChange} />
      </Field>,
    );

    fireEvent.change(screen.getByLabelText('Entrada'), { target: { value: 'ab0007x' } });

    expect(onChange.mock.calls[0][0].target.value).toBe('0,07');
  });
});
