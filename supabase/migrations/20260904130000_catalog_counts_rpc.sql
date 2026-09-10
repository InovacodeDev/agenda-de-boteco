-- RPC de contagem total do catálogo para o dashboard do admin.
--
-- POR QUE SECURITY INVOKER (default, sem SECURITY DEFINER):
-- a Etapa de paginação por cursor trocou useEstablishmentsQuery/useEventsQuery/
-- useNotificationsQuery (useInfiniteQuery) por flattenPages(...).length no
-- dashboard, que só reflete a 1ª página (DEFAULT_PAGE_SIZE = 20) — qualquer
-- tabela com mais de 20 linhas mostrava "20" no lugar do total real.
--
-- A função roda como o usuário autenticado (admin do painel), então a RLS já
-- resolve o acesso: select_establishments/select_notifications são
-- `USING (true)` (20260611185705) e select_events inclui `OR is_admin()`
-- (20260813120000) — um admin autenticado já enxerga 100% das linhas das 3
-- tabelas via RLS normal. Não há necessidade de elevar privilégio nem de
-- reimplementar a lógica da policy aqui — SECURITY DEFINER seria superfície
-- extra sem ganho. GRANT SELECT nas 3 tabelas para `authenticated` já existe
-- (20260902140000).
CREATE OR REPLACE FUNCTION public.get_catalog_counts()
RETURNS TABLE (
  establishments_count BIGINT,
  events_count BIGINT,
  notifications_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
  SELECT
    (SELECT count(*) FROM public.establishments) AS establishments_count,
    (SELECT count(*) FROM public.events) AS events_count,
    (SELECT count(*) FROM public.notifications) AS notifications_count;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_catalog_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_counts() TO authenticated;
