-- Distribuição de notas do bar do dono, agregada no banco. O painel de
-- avaliações pagina o histórico; média, total e distribuição não podem sair
-- só das páginas carregadas.
--
-- SECURITY INVOKER: a RLS select_owner_ratings (owns_establishment) já limita
-- as linhas ao dono; user_id nem é selecionado.
CREATE OR REPLACE FUNCTION public.get_owned_ratings_distribution(p_establishment_id TEXT)
RETURNS TABLE (
  rating SMALLINT,
  total BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $fn$
  SELECT r.rating, count(*)
  FROM public.establishment_ratings r
  WHERE r.establishment_id = p_establishment_id
  GROUP BY r.rating;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_owned_ratings_distribution(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owned_ratings_distribution(TEXT) TO authenticated;
