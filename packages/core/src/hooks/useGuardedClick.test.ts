/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useGuardedClick } from './useGuardedClick';

describe('useGuardedClick', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executa o handler na primeira chamada', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler));

    result.current?.();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignora o segundo clique dentro do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler, { cooldownMs: 600 }));

    result.current?.();
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('libera novo clique depois do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler, { cooldownMs: 600 }));

    result.current?.();
    jest.advanceTimersByTime(600);
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('devolve undefined quando o handler e undefined', () => {
    const { result } = renderHook(() => useGuardedClick(undefined));

    expect(result.current).toBeUndefined();
  });

  it('mantem a referencia estavel entre renders', () => {
    const handler = jest.fn();
    const { result, rerender } = renderHook(() => useGuardedClick(handler));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('invoca sempre o handler mais recente', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(({ handler }) => useGuardedClick(handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    result.current?.();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
