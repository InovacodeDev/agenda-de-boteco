import { render, screen } from '@testing-library/react-native';

import { Button } from './Button';
import { Sparkline } from './Sparkline';

describe('Regra de negócio: Sparkline', () => {
  it('descreve a série em um rótulo de acessibilidade resumido', async () => {
    await render(
      <Sparkline
        data={[
          { date: '2026-11-01', views: 3 },
          { date: '2026-11-02', views: 9 },
        ]}
      />,
    );

    expect(
      screen.getByLabelText(
        'Evolução de visualizações: 3 em 2026-11-01, chegando a 9 em 2026-11-02',
      ),
    ).toBeTruthy();
  });

  it('Button usa accessibilityLabel quando não há label', async () => {
    await render(<Button accessibilityLabel="Excluir evento" />);

    expect(screen.getByLabelText('Excluir evento')).toBeTruthy();
  });
});

describe('Tratamento de erro: Sparkline', () => {
  it('mostra mensagem quando não há dados no período', async () => {
    await render(<Sparkline data={[]} />);

    expect(screen.getByText('Sem dados no período.')).toBeTruthy();
  });
});
