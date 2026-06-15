import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { showUserFriendlyAlert } from '../utils/errors';

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
      showUserFriendlyAlert(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: unknown) => {
      showUserFriendlyAlert(error);
    },
  }),
});
