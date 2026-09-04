import { useEffect, useRef } from 'react';

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
 * viewport. Retorna o ref a ser colado num elemento no fim da lista.
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchNextPageRef = useRef(fetchNextPage);
  fetchNextPageRef.current = fetchNextPage;

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    const element = sentinelRef.current;
    const rootMargin = `0px 0px ${Math.round(threshold * 100)}% 0px`;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPageRef.current();
        }
      },
      { rootMargin },
    );
    if (element) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, threshold]);

  return sentinelRef;
}
