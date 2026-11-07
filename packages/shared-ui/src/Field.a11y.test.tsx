import { render, screen } from '@testing-library/react';

import { Field } from './Field';
import { TextInput } from './TextInput';

describe('Regra de negócio: controle válido sem erro em Field', () => {
  it('não marca aria-invalid quando não há erro', () => {
    render(
      <Field label="Nome do bar">
        <TextInput defaultValue="Boteco" />
      </Field>,
    );

    expect(screen.getByLabelText('Nome do bar')).not.toHaveAttribute('aria-invalid');
  });
});

describe('Tratamento de erro: propagação de aria-invalid no controle de Field', () => {
  it('marca aria-invalid="true" no input quando error está preenchido', () => {
    render(
      <Field label="Nome do bar" error="Campo obrigatório">
        <TextInput defaultValue="" />
      </Field>,
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
