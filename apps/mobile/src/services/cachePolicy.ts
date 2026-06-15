import { type Query } from '@tanstack/react-query';

/**
 * Versão do schema das queries persistidas. INCREMENTE este valor a cada
 * mudança na forma dos dados persistidos (queryKeys, shape de dados em cache):
 * o `buster` do PersistQueryClientProvider descarta caches antigos quando o
 * valor muda, evitando reidratar dados incompatíveis.
 */
export const CACHE_BUSTER = 'v1';

/**
 * Allowlist do catálogo: apenas o PRIMEIRO segmento da queryKey é considerado.
 * Mantém em sincronia com os literais de `catalogKeys` (queryKeys.ts) — note o
 * hífen em 'music-styles'. Queries fora desta lista (auth, sessão, localização)
 * NÃO são persistidas.
 */
const PERSIST_ALLOWLIST: readonly string[] = [
  'events',
  'establishments',
  'music-styles',
  'cities',
  'notifications',
];

/**
 * Decide se uma query entra no snapshot persistido. Persiste apenas queries
 * concluídas com sucesso cujo primeiro segmento da key esteja no allowlist do
 * catálogo. Rejeita status != 'success' e keys fora do catálogo.
 */
export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== 'success') {
    return false;
  }

  const firstSegment = query.queryKey[0];

  return typeof firstSegment === 'string' && PERSIST_ALLOWLIST.includes(firstSegment);
}
