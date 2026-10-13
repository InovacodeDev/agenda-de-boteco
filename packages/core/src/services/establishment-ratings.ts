import {
  type EstablishmentRating,
  establishmentRatingSchema,
  type EstablishmentRatingsSummary,
  ratingValueSchema,
  type UpsertEstablishmentRatingInput,
  upsertEstablishmentRatingSchema,
} from '../schemas/ratings';
import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';
import {
  type CatalogPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  quoteCursorValue,
} from '../utils/pagination';

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
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<EstablishmentRating>> {
  const client = getConfiguredSupabase();
  if (!client) return { items: [], nextCursor: null };

  try {
    const base = client
      .from('establishment_ratings')
      .select('id, establishment_id, rating, created_at, updated_at')
      .eq('establishment_id', establishmentId);
    const decoded = decodeCursor(cursor);
    const filtered = decoded
      ? base.or(
          `created_at.lt.${quoteCursorValue(decoded.value)},and(created_at.eq.${quoteCursorValue(decoded.value)},id.lt.${quoteCursorValue(decoded.id)})`,
        )
      : base;

    const { data, error } = await filtered
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (data ?? []).map((row) =>
      establishmentRatingSchema.parse({
        ...row,
        user_id: null,
      }),
    );
    const last = items.at(-1);
    const nextCursor =
      items.length < limit || !last
        ? null
        : encodeCursor({ value: last.created_at, id: last.id });
    return { items, nextCursor };
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentRatings.listEstablishmentRatingsForOwner',
      args: { establishmentId },
    });
  }
}

/**
 * Média, total e distribuição de TODAS as avaliações do bar, agregadas no banco
 * (get_owned_ratings_distribution, SECURITY INVOKER sob a RLS select_owner_ratings).
 * Separado da lista paginada: calcular só das páginas carregadas daria média errada.
 */
export async function getOwnerRatingsSummary(
  establishmentId: string,
): Promise<EstablishmentRatingsSummary> {
  const client = getConfiguredSupabase();
  if (!client) return calculateRatingsSummary([]);

  try {
    const { data, error } = await client.rpc('get_owned_ratings_distribution', {
      p_establishment_id: establishmentId,
    });
    if (error) throw error;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const row of data ?? []) {
      const rating = ratingValueSchema.parse(row.rating);
      const total = Number(row.total);
      distribution[rating as 1 | 2 | 3 | 4 | 5] += total;
      count += total;
      sum += rating * total;
    }
    const avg = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
    return { avg, count, distribution };
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentRatings.getOwnerRatingsSummary',
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
