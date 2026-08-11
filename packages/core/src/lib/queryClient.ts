import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

let errorHandler: (error: unknown) => void = (error) => {
  console.error('[query] erro não tratado (configureQueryErrorHandler não chamado):', error);
};
/** Cada app registra como exibir erros (mobile = Alert, web = toast/console). */
export function configureQueryErrorHandler(fn: (error: unknown) => void): void {
  errorHandler = fn;
}

/**
 * Client único do app. gcTime (25h) é estritamente maior que o maxAge do
 * persister (24h, em _layout.tsx) para dar margem: a query não pode ser
 * coletada pelo GC antes de expirar pelo maxAge, senão a intenção "cache
 * persiste 24h" fica frágil. staleTime de 5min é seguro porque a Etapa 7
 * invalida as queries via realtime.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 25 * 60 * 60_000,
      retry: 2,
    },
  },
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      errorHandler(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: unknown) => {
      errorHandler(error);
    },
  }),
});
