import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';

import { getConfiguredSupabase } from '../supabase/client';
import type { Database } from '../types';
import { isProduction } from '../utils/env';
import { trackEvent } from './analytics';
import { catalogKeys } from './queryKeys';

/**
 * Tabelas do catálogo presentes na publication `supabase_realtime`. Espelha as
 * migrações 20260612000200 e 20260813140000 — tabela adicionada aqui sem entrar
 * na publication assina um canal que nunca emite (falha silenciosa).
 */
const CATALOG_TABLES = [
  'events',
  'establishments',
  'notifications',
  'cities',
  'music_styles',
  'event_attractions',
] as const;

const CATALOG_CHANNEL = 'catalog-changes';

export const REALTIME_DEGRADED_THROTTLE_MS = 300_000;

const lastDegradedReportAt = new Map<string, number>();

/** Só para teste: zera o throttle entre casos. */
export function resetRealtimeDegradedThrottle(): void {
  lastDegradedReportAt.clear();
}

/**
 * Canal oscilando entre erro e `SUBSCRIBED` dispararia um evento por segundo;
 * o throttle por canal mantém o alerta útil sem estourar a quota. O `error` do
 * callback não vai no evento: pode trazer detalhe de RLS. `realtime_channel`,
 * não `channel`, porque `channel` é super property de canal de release.
 */
function reportRealtimeDegraded(channelName: string, status: string): void {
  const now = Date.now();
  const last = lastDegradedReportAt.get(channelName);
  if (last !== undefined && now - last < REALTIME_DEGRADED_THROTTLE_MS) {
    return;
  }
  lastDegradedReportAt.set(channelName, now);
  trackEvent('realtime_degraded', { realtime_channel: channelName, status });
}

/**
 * Resolve as query keys a invalidar quando uma tabela muda no Postgres. Função
 * PURA: a invalidação é por prefixo de root, então `['events']` cobre
 * `['events','detail',id]`, `['events','by-establishment',id]` e
 * `['events','attractions',id]`. Mudança em `establishments` revalida também
 * `events` porque os cards de evento renderizam dados do estabelecimento; o
 * mesmo vale para `cities` e `music_styles`, que aparecem embutidos nesses
 * cards além de alimentarem filtros. Tabela desconhecida → nenhuma invalidação.
 */
export function invalidationKeysForChange(table: string): QueryKey[] {
  switch (table) {
    case 'events':
      return [catalogKeys.events.root];
    case 'establishments':
      return [catalogKeys.establishments.root, catalogKeys.events.root];
    case 'notifications':
      return [catalogKeys.notifications];
    case 'cities':
      return [
        catalogKeys.cities,
        catalogKeys.establishments.root,
        catalogKeys.events.root,
      ];
    case 'music_styles':
      return [
        catalogKeys.musicStyles,
        catalogKeys.establishments.root,
        catalogKeys.events.root,
      ];
    case 'event_attractions':
      return [catalogKeys.events.root];
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
  onInvalidate: (keys: QueryKey[]) => void,
): () => void;
export function subscribeToCatalogChanges(
  client: SupabaseClient<Database>,
  onInvalidate: (keys: QueryKey[]) => void,
): () => void;
export function subscribeToCatalogChanges(
  clientOrOnInvalidate: SupabaseClient<Database> | ((keys: QueryKey[]) => void),
  onInvalidateOrClient?: ((keys: QueryKey[]) => void) | SupabaseClient<Database> | null,
): () => void {
  let client: SupabaseClient<Database> | null;
  let onInvalidate: (keys: QueryKey[]) => void;

  if (typeof clientOrOnInvalidate === 'function') {
    onInvalidate = clientOrOnInvalidate;
    client = (onInvalidateOrClient as SupabaseClient<Database> | null) ?? getConfiguredSupabase();
  } else {
    client = clientOrOnInvalidate;
    onInvalidate = onInvalidateOrClient as (keys: QueryKey[]) => void;
  }

  if (!client) {
    return () => {};
  }

  const channel = client.channel(CATALOG_CHANNEL);

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
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      reportRealtimeDegraded(CATALOG_CHANNEL, status);
    }
    // Sem rede ou com RLS bloqueando a subscription, `.subscribe()` falha em
    // silêncio (o usuário veria um catálogo defasado). Em dev, logamos o status
    // não-`SUBSCRIBED` para diagnosticar; a salvaguarda de correção continua
    // sendo o resubscribe + invalidação ao reentrar em `active` (useRealtimeSync).
    if (!isProduction() && status !== 'SUBSCRIBED' && status !== 'CLOSED') {
      console.warn(`[realtime] canal catalog-changes: ${status}`, error);
    }
  });

  return () => {
    // Fire-and-forget: o canal é descartado no cliente de forma síncrona; a
    // Promise de `removeChannel` (confirmação do servidor) não é aguardada.
    client.removeChannel(channel);
  };
}

