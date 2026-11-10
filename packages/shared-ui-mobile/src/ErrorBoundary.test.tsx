import { type AnalyticsAdapter, configureAnalytics } from '@agenda/core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ErrorBoundary } from './ErrorBoundary';

function makeAdapter(): AnalyticsAdapter & { captureException: jest.Mock } {
  return {
    captureException: jest.fn(),
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(false),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
  };
}

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('render exploded');
  }
  return <Text>conteúdo ok</Text>;
}

describe('Regra de negócio: ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    configureAnalytics(null);
  });

  it('renderiza os filhos quando não há erro', async () => {
    await render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('conteúdo ok')).toBeTruthy();
  });

  it('mostra o fallback e reporta a exceção com method ui.errorBoundary', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);

    await render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(adapter.captureException).toHaveBeenCalledTimes(1);
    const [error, metadata] = adapter.captureException.mock.calls[0] ?? [];
    expect((error as Error).message).toBe('render exploded');
    expect(metadata).toEqual(
      expect.objectContaining({
        method: 'ui.errorBoundary',
        componentStack: expect.stringContaining('ErrorBoundary'),
      }),
    );
  });

  it('volta a renderizar os filhos ao tocar em Tentar novamente', async () => {
    let explode = true;
    function Toggle() {
      return <Bomb explode={explode} />;
    }
    await render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>,
    );
    explode = false;

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(screen.getByText('conteúdo ok')).toBeTruthy();
  });
});

describe('Tratamento de erro: ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    configureAnalytics(null);
  });

  it('mostra o fallback mesmo sem adapter de analytics configurado', async () => {
    await render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
  });

  it('mostra o fallback mesmo se o adapter lançar ao reportar', async () => {
    const adapter = makeAdapter();
    adapter.captureException.mockImplementation(() => {
      throw new Error('sdk down');
    });
    configureAnalytics(adapter);

    await render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
  });
});
