import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

/**
 * `handledLocally` indica mutação com `onError` próprio: a tela já mostra o
 * erro, e o handler global deve se calar para não duplicar o aviso.
 */
export interface QueryErrorContext {
  source: 'query' | 'mutation';
  handledLocally: boolean;
}

export type QueryErrorHandler = (error: unknown, context: QueryErrorContext) => void;

let errorHandler: QueryErrorHandler = (error) => {
  console.error('[query] erro não tratado (configureQueryErrorHandler não chamado):', error);
};
/** Cada app registra como exibir erros (mobile = Alert, web = toast/console). */
export function configureQueryErrorHandler(fn: QueryErrorHandler): void {
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
      errorHandler(error, { source: 'query', handledLocally: false });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      errorHandler(error, {
        source: 'mutation',
        handledLocally: typeof mutation.options.onError === 'function',
      });
    },
  }),
});
