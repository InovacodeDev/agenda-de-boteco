import {
  type EstablishmentRating,
  establishmentRatingSchema,
  type EstablishmentRatingsSummary,
  type UpsertEstablishmentRatingInput,
  upsertEstablishmentRatingSchema,
} from '../schemas/ratings';
import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';

/**
 * Consulta a avaliação feita pelo usuário atualmente logado para o estabelecimento.
 * Retorna null se não autenticado ou se o usuário ainda não avaliou o estabelecimento.
 */
export async function getUserEstablishmentRating(
  establishmentId: string,
): Promise<EstablishmentRating | null> {
  const client = getConfiguredSupabase();
  if (!client) return null;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await client
      .from('establishment_ratings')
      .select('id, establishment_id, user_id, rating, created_at, updated_at')
      .eq('establishment_id', establishmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return establishmentRatingSchema.parse(data);
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentRatings.getUserEstablishmentRating',
      args: { establishmentId },
    });
  }
}

/**
 * Cria ou atualiza a avaliação (nota de 1 a 5) do usuário autenticado para um estabelecimento.
 * Garante idempotência: se o usuário já avaliou, atualiza a nota existente.
 */
export async function upsertEstablishmentRating(
  input: UpsertEstablishmentRatingInput,
): Promise<EstablishmentRating> {
  const validated = upsertEstablishmentRatingSchema.parse(input);
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    const existing = await getUserEstablishmentRating(validated.establishmentId);

    if (existing) {
      const { data, error } = await client
        .from('establishment_ratings')
        .update({ rating: validated.rating })
        .eq('id', existing.id)
        .select('id, establishment_id, user_id, rating, created_at, updated_at')
        .single();

      if (error) throw error;
      return establishmentRatingSchema.parse(data);
    }

    const { data, error } = await client
      .from('establishment_ratings')
      .insert({
        establishment_id: validated.establishmentId,
        user_id: userId,
        rating: validated.rating,
      })
      .select('id, establishment_id, user_id, rating, created_at, updated_at')
      .single();

    if (error) throw error;
    return establishmentRatingSchema.parse(data);
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentRatings.upsertEstablishmentRating',
      args: { establishmentId: validated.establishmentId, rating: validated.rating },
    });
  }
}

/**
 * Lista as avaliações recebidas pelo estabelecimento para o painel do dono (web-client).
 * Por privacidade e conformidade de anonimato, user_id nunca é exposto ao dono.
 */
export async function listEstablishmentRatingsForOwner(
  establishmentId: string,
): Promise<EstablishmentRating[]> {
  const client = getConfiguredSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('establishment_ratings')
      .select('id, establishment_id, rating, created_at, updated_at')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row) =>
      establishmentRatingSchema.parse({
        ...row,
        user_id: null,
      }),
    );
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentRatings.listEstablishmentRatingsForOwner',
      args: { establishmentId },
    });
  }
}

/**
 * Calcula resumo estatístico (média, total e distribuição de 1 a 5 estrelas).
 * Função pura e determinística para agregação no cliente ou painel.
 */
export function calculateRatingsSummary(
  ratings: Array<Pick<EstablishmentRating, 'rating'>>,
): EstablishmentRatingsSummary {
  const count = ratings.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (count === 0) {
    return {
      avg: 0,
      count: 0,
      distribution,
    };
  }

  let sum = 0;
  for (const item of ratings) {
    const star = item.rating as 1 | 2 | 3 | 4 | 5;
    if (distribution[star] !== undefined) {
      distribution[star] += 1;
    }
    sum += item.rating;
  }

  const rawAvg = sum / count;
  const avg = Math.round(rawAvg * 10) / 10;

  return {
    avg,
    count,
    distribution,
  };
}
