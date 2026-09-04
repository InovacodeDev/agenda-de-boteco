import type { SupabaseClient } from '@supabase/supabase-js';

import type { EventStatus } from '../schemas/catalog';
import { getConfiguredSupabase } from '../supabase/client';
import { shiftDate } from '../utils/dates';
import { handleServiceError } from '../utils/errors';
import { slugify } from '../utils/slug';

/**
 * Campos da agenda de eventos do painel do dono (Fase 3). Nomes em camelCase
 * mesmo onde a coluna é snake_case: quem preenche isto é o formulário, não o
 * banco — a tradução acontece uma vez, no payload de escrita aqui embaixo.
 */
export interface OwnedEventInput {
  name: string;
  description: string;
  bannerUrl: string;
  attraction: string;
  musicStyleIds: string[];
  /** ISO com offset; o horário local do dono é o que vale. */
  startsAt: string;
  endsAt: string;
  /** 0 = entrada free. */
  coverCharge: number;
  /** null quando o dono não controla lotação — a coluna é anulável. */
  capacity: number | null;
  courtesy: string;
  promo: string;
  status: EventStatus;
}

/**
 * Recorrência mensal cai no último dia do mês quando o dia não existe no destino
 * (31/jan + 1 mês = 28/fev) — ver shiftDate em utils/dates.
 */
export interface OwnedEventRecurrence {
  frequency: 'weekly' | 'monthly';
  count: number;
}

/**
 * Teto de ocorrências por série. A recorrência gera linhas reais em `events`,
 * então "toda semana, para sempre" viraria dezenas de milhares de eventos no
 * feed. 52 = um ano de recorrência semanal, horizonte suficiente para o dono
 * planejar; renovar a série é um clique, encolher 10 mil linhas não é.
 */
export const MAX_RECURRENCE_COUNT = 52;

/**
 * Mesmo escape hatch de queries/catalog.ts (eventsFrom): status, capacity e
 * recurrence_group_id ainda não estão em database.types.ts (arquivo gerado), e
 * sem isso o supabase-js recusa as colunas em tempo de compilação.
 */
function eventsTable() {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  return (client as SupabaseClient).from('events');
}

/**
 * id do evento no padrão do catálogo (slug do nome) + sufixo aleatório, como a
 * RPC create_owned_establishment faz. O sufixo não é enfeite: a recorrência cria
 * N eventos de nome idêntico ("Sexta do Sertanejo" toda semana), e slug puro
 * colidiria na primeira repetição.
 */
function buildEventId(name: string): string {
  const base = slugify(name) || 'evento';
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`.slice(0, 120);
}

/**
 * Traduz o input do formulário para as colunas de `events`. Campos que a tela do
 * dono não edita (slug, photo_urls, instagram_post_url) ficam de fora para o
 * save não zerar o que o admin preencheu.
 */
function toEventRow(
  establishmentId: string,
  input: OwnedEventInput,
  recurrenceGroupId: string | null,
) {
  return {
    establishment_id: establishmentId,
    name: input.name,
    description: input.description,
    banner_url: input.bannerUrl,
    attraction: input.attraction,
    music_style_ids: input.musicStyleIds,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    cover_charge: input.coverCharge,
    capacity: input.capacity,
    // Colunas anuláveis: '' viraria um selo de cortesia/promo vazio no card.
    courtesy: input.courtesy || null,
    promo: input.promo || null,
    status: input.status,
    recurrence_group_id: recurrenceGroupId,
  };
}

/**
 * Cria ou atualiza um evento do bar do dono. Escrita DIRETA na tabela, sem RPC:
 * as policies owner_insert_events/owner_update_events (20260812120000) já
 * restringem a linha ao bar de quem está logado.
 *
 * Retorna o id — novo no insert, o mesmo recebido no update.
 */
export async function saveOwnedEvent(
  establishmentId: string,
  input: OwnedEventInput,
  eventId?: string,
): Promise<string> {
  const events = eventsTable();
  try {
    const row = toEventRow(establishmentId, input, null);
    if (eventId) {
      // recurrence_group_id fica fora do update: editar uma ocorrência não deve
      // desligá-la da série a que pertence.
      const { recurrence_group_id: _ignored, ...updatable } = row;
      const { error } = await events.update(updatable).eq('id', eventId);
      if (error) {
        throw error;
      }
      return eventId;
    }
    const id = buildEventId(input.name);
    const { error } = await events.insert({ ...row, id, slug: id });
    if (error) {
      throw error;
    }
    return id;
  } catch (error) {
    return handleServiceError(error, {
      method: 'ownedEvents.saveOwnedEvent',
      args: { establishmentId, eventId, name: input.name },
    });
  }
}

export async function deleteOwnedEvent(eventId: string): Promise<void> {
  const events = eventsTable();
  try {
    const { error } = await events.delete().eq('id', eventId);
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, {
      method: 'ownedEvents.deleteOwnedEvent',
      args: { eventId },
    });
  }
}

/**
 * Cria N ocorrências reais de um evento, todas com o mesmo
 * `recurrence_group_id`. Um único INSERT em lote: se uma linha for recusada
 * (RLS, CHECK de capacity), nenhuma entra — meia série gravada seria pior que
 * nenhuma para o dono desfazer.
 *
 * A primeira ocorrência usa as datas do input; as seguintes deslocam +7 dias
 * (weekly) ou +1 mês (monthly), preservando o horário.
 */
export async function saveRecurringOwnedEvents(
  establishmentId: string,
  input: OwnedEventInput,
  recurrence: OwnedEventRecurrence,
): Promise<string[]> {
  const events = eventsTable();
  const count = Math.min(Math.max(recurrence.count, 1), MAX_RECURRENCE_COUNT);
  try {
    const groupId = `rec-${buildEventId(input.name)}`;
    const rows = Array.from({ length: count }, (_unused, index) => {
      const id = buildEventId(input.name);
      const occurrence: OwnedEventInput = {
        ...input,
        startsAt: shiftDate(input.startsAt, index, recurrence.frequency),
        endsAt: shiftDate(input.endsAt, index, recurrence.frequency),
      };
      return { ...toEventRow(establishmentId, occurrence, groupId), id, slug: id };
    });
    const { error } = await events.insert(rows);
    if (error) {
      throw error;
    }
    return rows.map((row) => row.id);
  } catch (error) {
    return handleServiceError(error, {
      method: 'ownedEvents.saveRecurringOwnedEvents',
      args: { establishmentId, name: input.name, count, frequency: recurrence.frequency },
    });
  }
}

/**
 * Apaga a série a partir de agora. Ocorrências já realizadas ficam: elas são o
 * histórico do bar (e o que o público já viu) — cancelar "toda quinta" a partir
 * de hoje não deve reescrever as quintas que aconteceram.
 */
export async function deleteOwnedEventGroup(
  recurrenceGroupId: string,
): Promise<void> {
  const events = eventsTable();
  try {
    const { error } = await events
      .delete()
      .eq('recurrence_group_id', recurrenceGroupId)
      .gte('starts_at', new Date().toISOString());
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, {
      method: 'ownedEvents.deleteOwnedEventGroup',
      args: { recurrenceGroupId },
    });
  }
}
