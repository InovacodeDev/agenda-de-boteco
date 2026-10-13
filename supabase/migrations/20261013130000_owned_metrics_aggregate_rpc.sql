-- Agrega establishment_metrics no banco. O select cru de linhas esbarrava no
-- teto de 1000 linhas do PostgREST e truncava os totais em silêncio.
--
-- SECURITY INVOKER de propósito: a RLS owner_select_establishment_metrics
-- (owns_establishment(establishment_id), avaliada com auth.uid()) já restringe
-- as linhas ao dono. Quem não é dono do bar recebe 0 linhas, nunca dado alheio.
-- O p_establishment_id só escolhe qual dos bares do próprio dono consultar.
CREATE OR REPLACE FUNCTION public.get_owned_metrics_aggregate(
  p_establishment_id TEXT,
  p_since_days INTEGER
)
RETURNS TABLE (
  day DATE,
  kind TEXT,
  event_id TEXT,
  total BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $fn$
BEGIN
  IF p_since_days IS NULL OR p_since_days < 1 OR p_since_days > 365 THEN
    RAISE EXCEPTION 'p_since_days fora do intervalo 1..365' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    (m.created_at AT TIME ZONE 'UTC')::date,
    m.kind,
    m.event_id,
    count(*)
  FROM public.establishment_metrics m
  WHERE m.establishment_id = p_establishment_id
    AND m.created_at >= now() - make_interval(days => p_since_days)
  GROUP BY 1, m.kind, m.event_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_owned_metrics_aggregate(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owned_metrics_aggregate(TEXT, INTEGER) TO authenticated;
