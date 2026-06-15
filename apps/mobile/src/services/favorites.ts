import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

export const favoriteTargetTypeSchema = z.enum(['event', 'establishment']);
export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;

export interface FavoriteTarget {
  type: FavoriteTargetType;
  id: string;
}

const favoriteRowSchema = z.object({
  target_type: favoriteTargetTypeSchema,
  target_id: z.string(),
});

const favoriteRowsSchema = z.array(favoriteRowSchema);

const TABLE = 'user_favorites';

/**
 * Retorna o client sem parametrização de Database para operar em tabelas
 * ainda não presentes nos tipos gerados (ex: migrations recentes).
 * Seguro: zod valida os dados retornados antes de sair desta camada.
 */
function rawClient(client: ReturnType<typeof getSupabase>): SupabaseClient {
  return client as SupabaseClient;
}

/** Favoritos do usuário logado. Sem client (deslogado/sem config) → []. */
export async function fetchServerFavorites(): Promise<FavoriteTarget[]> {
  const client = getSupabase();
  if (client === null) {
    return [];
  }
  const { data, error } = await rawClient(client).from(TABLE).select('target_type, target_id');
  if (error) {
    throw error;
  }
  const rows = favoriteRowsSchema.parse(data ?? []);
  return rows.map((row) => ({ type: row.target_type, id: row.target_id }));
}

/** Adiciona (idempotente via upsert) um favorito no servidor. No-op sem client. */
export async function addServerFavorite(
  userId: string,
  target: FavoriteTarget,
): Promise<void> {
  const client = getSupabase();
  if (client === null) {
    return;
  }
  const { error } = await rawClient(client)
    .from(TABLE)
    .upsert(
      { user_id: userId, target_type: target.type, target_id: target.id },
      { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true },
    );
  if (error) {
    throw error;
  }
}

/** Remove um favorito do servidor. No-op sem client. */
export async function removeServerFavorite(
  userId: string,
  target: FavoriteTarget,
): Promise<void> {
  const client = getSupabase();
  if (client === null) {
    return;
  }
  const { error } = await rawClient(client)
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('target_type', target.type)
    .eq('target_id', target.id);
  if (error) {
    throw error;
  }
}
