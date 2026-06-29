import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';

import type { Database } from '../types';
import { isProduction } from '../utils/env';
import { catalogKeys } from './queryKeys';

/** Tabelas do catálogo presentes na publication `supabase_realtime`. */
const CATALOG_TABLES = ['events', 'establishments', 'notifications'] as const;

/**
 * Resolve as query keys a invalidar quando uma tabela muda no Postgres. Função
 * PURA: a invalidação é por prefixo de root, então `['events']` cobre
 * `['events','detail',id]` e `['events','by-establishment',id]`. Mudança em
 * `establishments` revalida também `events` porque os cards de evento renderizam
 * dados do estabelecimento. Tabela desconhecida → nenhuma invalidação.
 */
export function invalidationKeysForChange(table: string): QueryKey[] {
  switch (table) {
    case 'events':
      return [catalogKeys.events.root];
    case 'establishments':
      return [catalogKeys.establishments.root, catalogKeys.events.root];
    case 'notifications':
      return [catalogKeys.notifications];
    default:
      return [];
  }
}

/**
 * Assina `postgres_changes` para as tabelas do catálogo em um único canal
 * (`catalog-changes`). Cada evento resolve as keys a partir de `payload.table`
 * (caminho único de resolução) e chama `onInvalidate`. Retorna o cleanup que
 * remove o canal — chame-o ao desmontar ou ao ir para background.
 */
export function subscribeToCatalogChanges(
  client: SupabaseClient<Database>,
  onInvalidate: (keys: QueryKey[]) => void,
): () => void {
  const channel = client.channel('catalog-changes');

  for (const table of CATALOG_TABLES) {
    channel.on(
      // O overload tipado de `.on` para 'postgres_changes' exige o literal.
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        onInvalidate(invalidationKeysForChange(payload.table));
      },
    );
  }

  channel.subscribe((status, error) => {
    // Sem rede ou com RLS bloqueando a subscription, `.subscribe()` falha em
    // silêncio (o usuário veria um catálogo defasado). Em dev, logamos o status
    // não-`SUBSCRIBED` para diagnosticar; a salvaguarda de correção continua
    // sendo o resubscribe + invalidação ao reentrar em `active` (useRealtimeSync).
    if (!isProduction() && status !== 'SUBSCRIBED') {
      console.warn(`[realtime] canal catalog-changes: ${status}`, error);
    }
  });

  return () => {
    // Fire-and-forget: o canal é descartado no cliente de forma síncrona; a
    // Promise de `removeChannel` (confirmação do servidor) não é aguardada.
    client.removeChannel(channel);
  };
}
