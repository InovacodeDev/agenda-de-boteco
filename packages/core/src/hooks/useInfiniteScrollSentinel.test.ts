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

/** Simula o React anexando o nó DOM: chama o callback ref com um elemento fake. */
function attachSentinel(sentinelRef: (element: HTMLDivElement | null) => void) {
  sentinelRef(document.createElement('div'));
}

describe('useInfiniteScrollSentinel', () => {
  it('nao chama fetchNextPage quando a sentinela nao esta visivel', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );
    attachSentinel(result.current);

    lastCallback?.([{ isIntersecting: false }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('chama fetchNextPage quando a sentinela entra na viewport', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );
    attachSentinel(result.current);

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('nao busca quando nao ha proxima pagina', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: false, isFetchingNextPage: false }),
    );
    attachSentinel(result.current);

    expect(observe).not.toHaveBeenCalled();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('nao busca enquanto uma busca ja esta em curso', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: true }),
    );
    attachSentinel(result.current);

    expect(observe).not.toHaveBeenCalled();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('desconecta o observer ao desmontar', () => {
    const fetchNextPage = jest.fn();
    const { result, unmount } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );
    attachSentinel(result.current);

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it('observa o elemento assim que ele e anexado, mesmo apos a sentinela nascer condicionalmente', () => {
    // Regressao: com object ref + useEffect([hasNextPage, isFetchingNextPage]),
    // uma sentinela que so aparece depois (ex.: lista filtrada esvaziou e
    // voltou a ter itens) nunca era observada, porque nenhuma das dependencias
    // do efeito mudava quando o ref passava de null para o elemento real.
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    expect(observe).not.toHaveBeenCalled();

    attachSentinel(result.current);

    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('desconecta o observer anterior quando o elemento e trocado por null (sentinela desmontada)', () => {
    const fetchNextPage = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );
    attachSentinel(result.current);
    expect(observe).toHaveBeenCalledTimes(1);

    result.current(null);

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
