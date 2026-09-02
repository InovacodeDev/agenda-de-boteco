import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getConfiguredSupabase } from '../supabase/client';
import { logErrorToTerminal } from '../utils/errors';

export const metricKindSchema = z.enum(['view', 'click_map', 'click_contact', 'click_share']);
export type MetricKind = z.infer<typeof metricKindSchema>;

export interface RecordMetricEventInput {
  establishmentId: string;
  eventId?: string;
  kind: MetricKind;
}

/**
 * Retorna o client sem parametrização de Database: a tabela é nova e ainda não
 * está em database.types.ts (arquivo gerado). Mesmo escape hatch de favorites.ts.
 */
function rawClient(client: ReturnType<typeof getConfiguredSupabase>): SupabaseClient {
  return client as SupabaseClient;
}

/**
 * Registra uma view ou clique de saída. Nunca lança: falha de tracking não
 * pode quebrar a navegação de quem está usando o app consumidor. Erros vão
 * para logErrorToTerminal (no-op em produção), não para handleServiceError
 * (que relançaria).
 */
export async function recordMetricEvent(input: RecordMetricEventInput): Promise<void> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return;
  }
  try {
    const { error } = await rawClient(client).rpc('record_metric_event', {
      p_establishment_id: input.establishmentId,
      p_event_id: input.eventId ?? null,
      p_kind: input.kind,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    logErrorToTerminal(error, { method: 'metrics.recordMetricEvent' });
  }
}

const metricRowSchema = z.object({
  establishment_id: z.string(),
  event_id: z.string().nullable(),
  kind: metricKindSchema,
  created_at: z.string(),
});

export interface MetricEvent {
  establishmentId: string;
  eventId: string | null;
  kind: MetricKind;
  createdAt: string;
}

/**
 * Linhas cruas do período pedido, só do bar do dono (RLS owner_select_establishment_metrics).
 * Sem RPC de agregação: o volume por bar é pequeno o bastante (dezenas de
 * eventos, no máximo alguns milhares de linhas/mês) para agregar em memória no
 * hook consumidor, sem manter um GROUP BY em SQL.
 */
export async function listOwnedMetrics(
  establishmentId: string,
  { sinceDays }: { sinceDays: number },
): Promise<MetricEvent[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return [];
  }
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await rawClient(client)
    .from('establishment_metrics')
    .select('establishment_id, event_id, kind, created_at')
    .eq('establishment_id', establishmentId)
    .gte('created_at', since);
  if (error) {
    throw error;
  }
  const rows = z.array(metricRowSchema).parse(data ?? []);
  return rows.map((row) => ({
    establishmentId: row.establishment_id,
    eventId: row.event_id,
    kind: row.kind,
    createdAt: row.created_at,
  }));
}

/**
 * Contagem de favoritos por evento, lida direto de user_favorites — sem
 * duplicar escrita em establishment_metrics quando o usuário favorita (spec
 * "Favoritar como métrica"). [] de entrada evita `.in('target_id', [])`, que o
 * Postgrest trata como filtro vazio (retornaria tudo, não nada).
 */
export async function listOwnedFavoritesCount(
  eventIds: string[],
): Promise<Record<string, number>> {
  const client = getConfiguredSupabase();
  if (client === null || eventIds.length === 0) {
    return {};
  }
  const { data, error } = await rawClient(client)
    .from('user_favorites')
    .select('target_id')
    .eq('target_type', 'event')
    .in('target_id', eventIds);
  if (error) {
    throw error;
  }
  const rows = z.array(z.object({ target_id: z.string() })).parse(data ?? []);
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.target_id] = (acc[row.target_id] ?? 0) + 1;
    return acc;
  }, {});
}
