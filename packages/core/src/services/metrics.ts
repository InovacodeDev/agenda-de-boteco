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

const metricAggregateRowSchema = z.object({
  day: z.string(),
  event_id: z.string().nullable(),
  kind: metricKindSchema,
  total: z.union([z.string(), z.number()]),
});

export interface MetricAggregate {
  day: string;
  eventId: string | null;
  kind: MetricKind;
  total: number;
}

export const MAX_METRICS_SINCE_DAYS = 365;

/**
 * Contagens por (dia UTC, tipo, evento) agregadas no banco via
 * get_owned_metrics_aggregate (SECURITY INVOKER, RLS owner_select_establishment_metrics).
 * Select cru de linhas truncava os totais no teto de 1000 linhas do PostgREST.
 */
export async function listOwnedMetrics(
  establishmentId: string,
  { sinceDays }: { sinceDays: number },
): Promise<MetricAggregate[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return [];
  }
  if (!Number.isInteger(sinceDays) || sinceDays < 1 || sinceDays > MAX_METRICS_SINCE_DAYS) {
    throw new Error('Período de métricas inválido');
  }
  const { data, error } = await client.rpc('get_owned_metrics_aggregate', {
    p_establishment_id: establishmentId,
    p_since_days: sinceDays,
  });
  if (error) {
    throw error;
  }
  return z
    .array(metricAggregateRowSchema)
    .parse(data ?? [])
    .map((row) => ({
      day: row.day,
      eventId: row.event_id,
      kind: row.kind,
      total: Number(row.total),
    }));
}

const favoritesCountRowSchema = z.object({
  event_id: z.string(),
  favorites_count: z.union([z.string(), z.number()]),
});

/**
 * Contagem de favoritos por evento, agregada no banco via RPC (não
 * `.from('user_favorites')` direto): select_own_favorites restringe a tabela a
 * `auth.uid() = user_id`, e o dono do bar não é quem favoritou — sem a RPC
 * SECURITY DEFINER, a RLS devolveria sempre 0 linhas. Cobre TODOS os eventos do
 * bar, não só os já carregados por useOwnedEvents (que pagina).
 */
export async function getOwnedFavoritesCountByEstablishment(
  establishmentId: string,
): Promise<Record<string, number>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return {};
  }
  const { data, error } = await rawClient(client).rpc('get_owned_favorites_count', {
    p_establishment_id: establishmentId,
  });
  if (error) {
    throw error;
  }
  const rows = z.array(favoritesCountRowSchema).parse(data ?? []);
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.event_id] = Number(row.favorites_count);
    return acc;
  }, {});
}
