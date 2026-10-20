-- Identificador opaco para URLs/PostHog. events.id/establishments.id são TEXT
-- slug-shaped (previsíveis) e vazam a estrutura interna quando aparecem em link
-- compartilhado ou em evento de analytics. external_id é um UUID gerado no
-- banco, sem relação com o slug, e passa a ser o único id que sai do app.
--
-- Links antigos continuam funcionando: a leitura por id (TEXT) permanece
-- disponível, a mudança é só no que o app passa a EMITIR (packages/core/src
-- decide o fallback). profiles.external_id serve o mesmo propósito para o
-- distinct_id do PostHog, hoje o auth.uid() puro.
ALTER TABLE public.events
  ADD COLUMN external_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.establishments
  ADD COLUMN external_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.profiles
  ADD COLUMN external_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX events_external_id_key ON public.events (external_id);
CREATE UNIQUE INDEX establishments_external_id_key ON public.establishments (external_id);
CREATE UNIQUE INDEX profiles_external_id_key ON public.profiles (external_id);

-- nearby_establishments (RPC de proximidade) projeta as colunas de
-- establishments explicitamente — precisa incluir external_id, senão o app não
-- consegue montar link/analytics para bar encontrado por "perto de mim".
DROP FUNCTION IF EXISTS public.nearby_establishments(
  double precision, double precision, double precision, integer
);

CREATE FUNCTION public.nearby_establishments(
  origin_lat double precision,
  origin_lng double precision,
  radius_km double precision,
  max_results integer
)
RETURNS TABLE (
  id text,
  external_id uuid,
  name text,
  description text,
  logo_url text,
  cover_url text,
  address text,
  neighborhood text,
  city_id text,
  lat double precision,
  lng double precision,
  location public.geography(Point, 4326),
  whatsapp text,
  instagram text,
  opening_hours text,
  menu_items jsonb,
  price_range public.price_range_enum,
  ambiance text,
  rating_avg numeric(3, 2),
  rating_count integer,
  attributes public.establishment_attribute_enum[],
  slug text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    e.id,
    e.external_id,
    e.name,
    e.description,
    e.logo_url,
    e.cover_url,
    e.address,
    e.neighborhood,
    e.city_id,
    e.lat,
    e.lng,
    e.location,
    e.whatsapp,
    e.instagram,
    e.opening_hours,
    e.menu_items,
    e.price_range,
    e.ambiance,
    e.rating_avg,
    e.rating_count,
    e.attributes,
    e.slug,
    public.st_distance(
      e.location,
      public.st_setsrid(public.st_point(origin_lng, origin_lat), 4326)::public.geography
    ) / 1000.0 AS distance_km
  FROM public.establishments e
  WHERE e.location IS NOT NULL
    AND public.st_dwithin(
      e.location,
      public.st_setsrid(public.st_point(origin_lng, origin_lat), 4326)::public.geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_establishments(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;

-- Grants de 20260902140000 são a nível de tabela (sem lista de coluna), então
-- events/establishments/profiles já expõem external_id via SELECT existente —
-- nenhum GRANT novo necessário.
