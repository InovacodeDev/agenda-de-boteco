import { type Query } from '@tanstack/react-query';

/**
 * Versão do schema das queries persistidas. INCREMENTE este valor a cada
 * mudança na forma dos dados persistidos (queryKeys, shape de dados em cache):
 * o `buster` do PersistQueryClientProvider descarta caches antigos quando o
 * valor muda, evitando reidratar dados incompatíveis.
 *
 * Campo novo em `establishmentSchema`/`eventSchema` conta como mudança de shape:
 * a rehidratação NÃO passa pelo Zod, então o `.default([])` não preenche o campo
 * ausente e o cache antigo chega à UI incompleto. v1 -> v2: `attributes`.
 * v2 -> v3: listagens viraram infinite query ({ pages, pageParams }).
 * v3 -> v4: `external_id` em establishments/events (sem default local no app;
 * cache antigo sem o campo quebraria a navegação por link/analytics).
 */
export const CACHE_BUSTER = 'v4';

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
 * Segundo segmento de keys que ficam fora do storage mesmo sob um primeiro
 * segmento permitido: 'by-ids' carrega a lista de ids favoritados e cresce uma
 * entrada por seleção; 'search' carrega o texto digitado pelo usuário.
 */
const NON_PERSISTED_SECOND_SEGMENTS: readonly string[] = ['by-ids', 'search'];

/**
 * Decide se uma query entra no snapshot persistido. Persiste apenas queries
 * concluídas com sucesso cujo primeiro segmento da key esteja no allowlist do
 * catálogo e cujo segundo não seja de lookup por ids/busca. Rejeita
 * status != 'success' e keys fora do catálogo.
 */
export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== 'success') {
    return false;
  }

  const [firstSegment, secondSegment] = query.queryKey;

  if (typeof secondSegment === 'string' && NON_PERSISTED_SECOND_SEGMENTS.includes(secondSegment)) {
    return false;
  }

  return typeof firstSegment === 'string' && PERSIST_ALLOWLIST.includes(firstSegment);
}
