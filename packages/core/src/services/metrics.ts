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
