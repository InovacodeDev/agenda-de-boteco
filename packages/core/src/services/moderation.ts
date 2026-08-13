import type { SupabaseClient } from '@supabase/supabase-js';

import { FEATURES } from '../config/features';
import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';
import { buildModerationExcerpt, findFlaggedTerms } from '../utils/moderation';
import { slugify } from '../utils/slug';

/** Entidades moderáveis — espelha o CHECK de moderation_queue.entity_type. */
export type ModerationEntityType = 'event' | 'establishment';

/** Um campo sinalizado: qual campo, quais termos casaram e o contexto. */
export type ModerationFlag = {
  field: string;
  terms: string[];
  excerpt: string;
};

export interface ScreenContentInput {
  entityType: ModerationEntityType;
  entityId: string;
  /** Campo → texto, como veio do formulário (ex: { description: '...' }). */
  fields: Record<string, string>;
}

/** Entrada pendente na fila, como o dono a vê. */
export interface PendingModeration {
  id: string;
  field: string;
  excerpt: string;
  matchedTerms: string[];
  createdAt: string;
}

/**
 * Mesmo escape hatch de owned-events.ts (eventsTable): moderation_queue e
 * moderation_terms ainda não estão em database.types.ts (arquivo gerado), e sem
 * isso o supabase-js recusa as tabelas em tempo de compilação.
 */
function moderationTable(client: unknown, table: 'moderation_queue' | 'moderation_terms') {
  return (client as SupabaseClient).from(table);
}

/**
 * id da linha da fila no padrão do repo (slug + sufixo aleatório, como
 * buildEventId em owned-events.ts). O sufixo evita colisão quando o mesmo campo
 * da mesma entidade é sinalizado mais de uma vez — cada save suspeito é uma
 * entrada nova, porque a fila é histórico de decisão.
 */
function buildQueueId(entityId: string, field: string): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${slugify(`${entityId}-${field}`) || 'mod'}-${suffix}`.slice(0, 120);
}

/**
 * Lista os termos cadastrados em moderation_terms. Sem Supabase configurado
 * devolve [] em vez de lançar: a triagem é acessória e nunca deve ser o motivo
 * de um cadastro falhar.
 */
export async function listModerationTerms(): Promise<string[]> {
  const client = getConfiguredSupabase();
  if (!client) {
    return [];
  }
  try {
    const { data, error } = await moderationTable(client, 'moderation_terms').select('term');
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => String((row as { term: unknown }).term));
  } catch (error) {
    return handleServiceError(error, { method: 'moderation.listModerationTerms' });
  }
}

/**
 * Tria os textos de uma entidade contra a lista de termos e enfileira em
 * moderation_queue um registro por campo sinalizado. Devolve o que foi
 * sinalizado (vazio = nada suspeito).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ A FLAG MANDA: com FEATURES.contentModeration === false esta função sai   │
 * │ com [] ANTES de tocar no Supabase. Nenhuma leitura de termos, nenhum     │
 * │ insert na fila, nenhum round-trip. É o que mantém a feature inerte       │
 * │ enquanto o item do orçamento não é aprovado.                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Quando ligarem a flag, a integração é chamar isto depois do save, sem
 * bloquear a publicação: em `saveOwnedEvent` (services/owned-events.ts), com os
 * campos name/description/attraction do evento, e em `updateOwnedEstablishment`
 * / `createOwnedEstablishment` (services/establishment-owner.ts), com
 * name/description/ambiance do bar. Depois do save, porque a policy de INSERT
 * confere a posse via entity_id — a linha precisa existir antes.
 */
export async function screenContent(input: ScreenContentInput): Promise<ModerationFlag[]> {
  if (!FEATURES.contentModeration) {
    return [];
  }
  const client = getConfiguredSupabase();
  if (!client) {
    return [];
  }
  try {
    const terms = await listModerationTerms();
    if (terms.length === 0) {
      return [];
    }
    const flags: ModerationFlag[] = [];
    for (const [field, text] of Object.entries(input.fields)) {
      const matched = findFlaggedTerms(text, terms);
      if (matched.length > 0) {
        flags.push({ field, terms: matched, excerpt: buildModerationExcerpt(text, matched[0]) });
      }
    }
    if (flags.length === 0) {
      return [];
    }
    // INSERT em lote: a fila é um efeito colateral do save, não vale N
    // round-trips para gravá-la.
    const { error } = await moderationTable(client, 'moderation_queue').insert(
      flags.map((flag) => ({
        id: buildQueueId(input.entityId, flag.field),
        entity_type: input.entityType,
        entity_id: input.entityId,
        field: flag.field,
        excerpt: flag.excerpt,
        matched_terms: flag.terms,
      })),
    );
    if (error) {
      throw error;
    }
    return flags;
  } catch (error) {
    return handleServiceError(error, {
      method: 'moderation.screenContent',
      args: { entityType: input.entityType, entityId: input.entityId },
    });
  }
}

/**
 * Entradas ainda pendentes de uma entidade — o dono usa para saber que há texto
 * em revisão. Respeita a flag do mesmo jeito que screenContent: desligada, não
 * consulta o banco.
 */
export async function listPendingModeration(
  entityType: ModerationEntityType,
  entityId: string,
): Promise<PendingModeration[]> {
  if (!FEATURES.contentModeration) {
    return [];
  }
  const client = getConfiguredSupabase();
  if (!client) {
    return [];
  }
  try {
    const { data, error } = await moderationTable(client, 'moderation_queue')
      .select('id, field, excerpt, matched_terms, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'pending');
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => {
      const entry = row as {
        id: string;
        field: string;
        excerpt: string;
        matched_terms: string[] | null;
        created_at: string;
      };
      return {
        id: entry.id,
        field: entry.field,
        excerpt: entry.excerpt,
        matchedTerms: entry.matched_terms ?? [],
        createdAt: entry.created_at,
      };
    });
  } catch (error) {
    return handleServiceError(error, {
      method: 'moderation.listPendingModeration',
      args: { entityType, entityId },
    });
  }
}
