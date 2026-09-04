/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useInfiniteScrollSentinel } from './useInfiniteScrollSentinel';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let lastCallback: ObserverCallback | null = null;
const observe = jest.fn();
const disconnect = jest.fn();

beforeEach(() => {
  lastCallback = null;
  observe.mockClear();
  disconnect.mockClear();

  class FakeIntersectionObserver {
    constructor(callback: ObserverCallback) {
      lastCallback = callback;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = jest.fn();
    takeRecords = jest.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  }

  global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe('useInfiniteScrollSentinel', () => {
  it('nao chama fetchNextPage quando a sentinela nao esta visivel', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: false }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('chama fetchNextPage quando a sentinela entra na viewport', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('nao busca quando nao ha proxima pagina', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: false, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('nao busca enquanto uma busca ja esta em curso', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: true }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('desconecta o observer ao desmontar', () => {
    const fetchNextPage = jest.fn();
    const { unmount } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
