/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useGuardedPress } from './useGuardedPress';
import { useEstablishmentStatusLight, useEventStatusLight } from './useStatusLight';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T20:00:00-03:00'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Regra de negócio: toque protegido e semáforo', () => {
  it('repassa os argumentos ao handler mais recente', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(({ handler }) => useGuardedPress(handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    result.current?.('a', 1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('a', 1);
  });

  it('libera novo toque depois do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedPress(handler, { cooldownMs: 100 }));

    result.current?.();
    jest.advanceTimersByTime(101);
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('mostra evento rolando agora e muda ao passar do fim', () => {
    const { result } = renderHook(() =>
      useEventStatusLight('2026-11-07T19:00:00-03:00', '2026-11-07T20:01:00-03:00'),
    );
    expect(result.current?.tone).not.toBe('red');

    jest.advanceTimersByTime(60_000);
    const { result: after } = renderHook(() =>
      useEventStatusLight('2026-11-07T19:00:00-03:00', '2026-11-07T20:01:00-03:00'),
    );

    expect(after.current).toEqual({ tone: 'red', label: 'Encerrado' });
  });
});

describe('Tratamento de erro: toque protegido e semáforo', () => {
  it('ignora duplo toque dentro do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedPress(handler));

    result.current?.();
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('devolve undefined sem handler', () => {
    const { result } = renderHook(() => useGuardedPress(undefined));

    expect(result.current).toBeUndefined();
  });

  it('não exibe semáforo para datas inválidas', () => {
    const { result } = renderHook(() => useEventStatusLight('não é data', 'nem esta'));

    expect(result.current).toBeNull();
  });

  it('não exibe semáforo para horário de funcionamento ilegível', () => {
    const { result } = renderHook(() => useEstablishmentStatusLight(''));

    expect(result.current).toBeNull();
  });
});
