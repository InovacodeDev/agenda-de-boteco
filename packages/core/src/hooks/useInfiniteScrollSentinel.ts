import { useCallback, useEffect, useRef } from 'react';

export interface InfiniteScrollSentinelOptions {
  fetchNextPage: () => unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /**
   * Antecipacao da busca, como fracao da viewport (entre 0 e 1). 0.2 dispara
   * quando falta 20% para o fim — o equivalente web do onEndReachedThreshold
   * do FlashList.
   */
  threshold?: number;
}

/**
 * Dispara a proxima pagina quando o elemento sentinela se aproxima da
 * viewport. Retorna um callback ref a ser colado num elemento no fim da
 * lista — nao um object ref: a sentinela pode ser montada/desmontada
 * condicionalmente (ex.: `{hasNextPage ? <div ref={sentinelRef} /> : null}`,
 * ou escondida atras de um filtro client-side que zera a lista), e um
 * `useEffect` reagindo só a hasNextPage/isFetchingNextPage nao percebe o nó
 * aparecer depois — o callback ref observa no exato momento em que o
 * elemento entra no DOM.
 *
 * fetchNextPage vai numa ref porque o TanStack Query v5 nao garante
 * estabilidade referencial entre renders — sem isso o observer seria
 * recriado a cada digitacao num filtro acima da lista.
 */
export function useInfiniteScrollSentinel({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  threshold = 0.2,
}: InfiniteScrollSentinelOptions) {
  const fetchNextPageRef = useRef(fetchNextPage);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const sentinelRef = useCallback(
    (element: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!element || !hasNextPage || isFetchingNextPage) {
        return;
      }
      const rootMargin = `0px 0px ${Math.round(threshold * 100)}% 0px`;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            fetchNextPageRef.current();
          }
        },
        { rootMargin },
      );
      observer.observe(element);
      observerRef.current = observer;
    },
    [hasNextPage, isFetchingNextPage, threshold],
  );

  return sentinelRef;
}
