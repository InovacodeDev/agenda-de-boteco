/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from './useDebouncedValue';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('começa com o valor inicial', () => {
    const { result } = renderHook(() => useDebouncedValue('a'));
    expect(result.current).toBe('a');
  });

  it('só propaga o novo valor depois do atraso padrão', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('reinicia o atraso a cada mudança e entrega só o último valor', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(80);
    });
    rerender({ value: 'c' });
    act(() => {
      jest.advanceTimersByTime(80);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(result.current).toBe('c');
  });

  it('cancela o timer pendente ao desmontar', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
