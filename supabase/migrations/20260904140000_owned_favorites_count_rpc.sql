-- RPC de contagem de favoritos por evento para a página de Métricas do painel.
--
-- POR QUE SECURITY DEFINER (diferente de get_catalog_counts, 20260904130000):
-- lá o admin já enxerga as 3 tabelas via RLS normal (SECURITY INVOKER bastava).
-- Aqui não: select_own_favorites (20260615120000) restringe user_favorites a
-- `auth.uid() = user_id` — o dono do bar não é o user_id da linha de favorito
-- (é quem favoritou, um terceiro qualquer). Sem SECURITY DEFINER, a RLS
-- devolveria sempre 0 linhas para o dono. A função eleva o privilégio de leitura
-- só para esta agregação, e por isso PRECISA validar owns_establishment() antes
-- de rodar — sem essa checagem, qualquer usuário autenticado poderia contar
-- favoritos de qualquer bar (BOLA).
--
-- Corrige a truncagem de packages/core/src/services/metrics.ts:
-- listOwnedFavoritesCount(eventIds) só recebia os eventIds da 1ª página de
-- useOwnedEvents (useInfiniteQuery, DEFAULT_PAGE_SIZE = 20) — uma agenda
-- recorrente semanal (até MAX_RECURRENCE_COUNT = 52) passa fácil de 20 eventos,
-- então favoritos de eventos além da 1ª página nunca eram contados.
CREATE OR REPLACE FUNCTION public.get_owned_favorites_count(p_establishment_id TEXT)
RETURNS TABLE (
  event_id TEXT,
  favorites_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.owns_establishment(p_establishment_id) THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT events.id, count(*)
  FROM public.user_favorites
  JOIN public.events ON events.id = user_favorites.target_id
  WHERE user_favorites.target_type = 'event'
    AND events.establishment_id = p_establishment_id
  GROUP BY events.id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_owned_favorites_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owned_favorites_count(TEXT) TO authenticated;
