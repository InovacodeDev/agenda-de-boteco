import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createElement as mockCreateElement } from 'react';
import { Pressable as mockPressable, Text as mockText } from 'react-native';

import { DatePickerField } from './DatePickerField';
import { EmptyState } from './EmptyState';
import { Field } from './Field';
import { SelectField } from './SelectField';
import { TextInput } from './TextInput';
import { TimePickerField } from './TimePickerField';
import { ToastProvider, useToast } from './Toast';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  return function MockDateTimePicker({
    mode,
    onChange,
  }: {
    mode: string;
    onChange: (event: { type: string }, date?: Date) => void;
  }) {
    return mockCreateElement(
      mockPressable,
      {
        accessibilityRole: 'button',
        onPress: () => onChange({ type: 'set' }, new Date(2026, 10, 7, 21, 30, 0)),
      },
      mockCreateElement(mockText, null, `picker-${mode}`),
    );
  };
});

function ToastTrigger() {
  const toast = useToast();
  return (
    <EmptyState
      title="Sem eventos"
      message="Cadastre o primeiro evento"
      actionLabel="Notificar"
      onAction={() => toast.show({ tone: 'error', message: 'Falha ao salvar' })}
    />
  );
}

describe('Regra de negócio: campos, seletores e feedback mobile', () => {
  it('Field exibe label, indicador obrigatório e helperText', async () => {
    await render(
      <Field label="Entrada" required helperText="Valor em reais">
        <TextInput value="" onChangeText={() => {}} />
      </Field>,
    );

    expect(screen.getByText(/Entrada/)).toBeTruthy();
    expect(screen.getByText('Valor em reais')).toBeTruthy();
  });

  it('TextInput type="currency" formata centavos em moeda brasileira', async () => {
    const onChangeText = jest.fn();
    await render(<TextInput type="currency" prefix value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByPlaceholderText('0,00'), '2500');

    expect(onChangeText).toHaveBeenCalledWith('R$ 25,00');
  });

  it('DatePickerField e TimePickerField formatam a seleção', async () => {
    const onDateChange = jest.fn();
    const onTimeChange = jest.fn();
    await render(
      <>
        <DatePickerField value="2026-11-01" onValueChange={onDateChange} />
        <TimePickerField value="" onValueChange={onTimeChange} />
      </>,
    );

    expect(screen.getByText('01/11/2026')).toBeTruthy();
    await fireEvent.press(screen.getByText('01/11/2026'));
    await fireEvent.press(screen.getByText('picker-date'));
    expect(onDateChange).toHaveBeenCalledWith('2026-11-07');

    await fireEvent.press(screen.getByText('00:00'));
    await fireEvent.press(screen.getByText('picker-time'));
    expect(onTimeChange).toHaveBeenCalledWith('21:30');
  });

  it('SelectField filtra opções e emite o item escolhido', async () => {
    const onValueChange = jest.fn();
    await render(
      <SelectField
        value=""
        onValueChange={onValueChange}
        searchable
        options={[
          { value: 'samba', label: 'Samba', emoji: '🥁' },
          { value: 'rock', label: 'Rock', emoji: '🎸' },
        ]}
      />,
    );

    await fireEvent.press(screen.getByText('Selecione…'));
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar opção…'), 'rock');
    expect(screen.queryByText(/Samba/)).toBeNull();

    await fireEvent.press(screen.getByText(/Rock/));
    expect(onValueChange).toHaveBeenCalledWith('rock');
  });
});

describe('Tratamento de erro: feedback de erro em Field e Toast mobile', () => {
  it('Field prioriza mensagem de erro sobre helperText', async () => {
    await render(
      <Field label="Nome" helperText="Dica" error="Informe o nome">
        <TextInput error value="" onChangeText={() => {}} />
      </Field>,
    );

    expect(screen.getByText('Informe o nome')).toBeTruthy();
    expect(screen.queryByText('Dica')).toBeNull();
  });

  it('useToast fora do provider lança erro e ToastProvider exibe alerta de erro', async () => {
    function Orphan() {
      useToast();
      return null;
    }
    await expect(render(<Orphan />)).rejects.toThrow(
      'useToast precisa estar dentro de <ToastProvider>',
    );

    jest.useFakeTimers();
    try {
      await render(
        <ToastProvider>
          <ToastTrigger />
        </ToastProvider>,
      );

      await fireEvent.press(screen.getByText('Notificar'));
      expect(screen.getByText('Falha ao salvar')).toBeTruthy();

      await act(async () => {
        jest.runAllTimers();
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
