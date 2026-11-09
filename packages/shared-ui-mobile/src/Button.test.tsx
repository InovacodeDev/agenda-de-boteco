import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';
import { cn } from './cn';
import { SegmentedTabs } from './SegmentedTabs';
import { Switch } from './Switch';

describe('Regra de negócio: controles básicos mobile', () => {
  it('Button dispara onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Salvar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Switch emite o valor invertido', async () => {
    const onCheckedChange = jest.fn();
    await render(<Switch checked={false} onCheckedChange={onCheckedChange} />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('SegmentedTabs emite a aba tocada', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedTabs
        options={[
          { id: 'upcoming', label: 'Próximos' },
          { id: 'past', label: 'Passados' },
        ]}
        value="upcoming"
        onChange={onChange}
      />,
    );

    await fireEvent.press(screen.getByText('Passados'));

    expect(onChange).toHaveBeenCalledWith('past');
  });

  it('cn resolve conflito de classes Tailwind mantendo a última', () => {
    expect(cn('p-2 text-sm', false, 'p-4')).toBe('text-sm p-4');
  });
});

describe('Tratamento de erro: controles básicos mobile', () => {
  it.each([
    ['desabilitado', { disabled: true }],
    ['ocupado', { busy: true }],
  ])('Button %s não dispara onPress', async (_label, props) => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" onPress={onPress} {...props} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('Switch desabilitado não emite', async () => {
    const onCheckedChange = jest.fn();
    await render(<Switch checked onCheckedChange={onCheckedChange} disabled />);

    await fireEvent.press(screen.getByRole('switch'));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
