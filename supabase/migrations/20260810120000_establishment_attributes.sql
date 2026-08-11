-- Atributos de estabelecimento: substitui `highlights` (text[] livre, digitado à
-- mão no admin) por um enum fechado, filtrável no feed de eventos e de bares.
-- A lista é fixa em código (ESTABLISHMENT_ATTRIBUTES no @agenda/core); enum +
-- array cobre o filtro com um operador de overlap, sem tabela pivot.

CREATE TYPE public.establishment_attribute_enum AS ENUM (
  -- Infraestrutura e comodidades
  'pet-friendly',
  'kids-area',
  'accessible-pcd',
  'parking',
  'outdoor-space',
  'work-friendly',
  'free-wifi',
  'air-conditioning',
  -- Vibe e atmosfera
  'live-music',
  'dj-set',
  'cozy-romantic',
  'lively-party',
  'scenic-view',
  -- Transmissão de esportes e jogos
  'live-sports',
  'sports-audio-on',
  'big-screen-tvs',
  'national-soccer',
  'international-soccer',
  'other-sports',
  'game-day-deals',
  'cheering-environment',
  -- Gastronomia e restrições
  'vegan-options',
  'vegetarian-options',
  'gluten-free-lactose-free',
  'kids-menu',
  'signature-cocktails',
  'craft-beer',
  -- Ocasião e público
  'good-for-groups',
  'great-for-dates',
  'happy-hour',
  'lgbtq-friendly',
  'family-friendly',
  -- Serviços e pagamentos
  'accepts-meal-voucher',
  'accepts-reservations',
  'free-entry',
  'counter-service'
);

ALTER TABLE public.establishments
  ADD COLUMN attributes public.establishment_attribute_enum[] NOT NULL DEFAULT '{}';

-- Backfill best-effort: `highlights` era texto livre, então só o que casa por
-- texto normalizado vira atributo. Destaques sem correspondência no enum
-- ("Chope gelado", "Mesa de sinuca", "Camarote") são descartados por decisão
-- do produto — o campo livre deixa de existir.
UPDATE public.establishments e
SET attributes = COALESCE(matched.attrs, '{}')
FROM (
  SELECT
    s.id,
    ARRAY_AGG(DISTINCT s.attr) FILTER (WHERE s.attr IS NOT NULL) AS attrs
  FROM (
    SELECT
      est.id,
      CASE
        WHEN h ILIKE '%pet%' THEN 'pet-friendly'
        WHEN h ILIKE '%kids%' OR h ILIKE '%crian%' OR h ILIKE '%infantil%' THEN 'kids-area'
        WHEN h ILIKE '%acess%' OR h ILIKE '%pcd%' THEN 'accessible-pcd'
        WHEN h ILIKE '%estacionamento%' OR h ILIKE '%valet%' THEN 'parking'
        WHEN h ILIKE '%calçada%' OR h ILIKE '%ar livre%' OR h ILIKE '%varanda%'
          OR h ILIKE '%rooftop%' OR h ILIKE '%jardim%' OR h ILIKE '%quintal%' THEN 'outdoor-space'
        WHEN h ILIKE '%wi-fi%' OR h ILIKE '%wifi%' THEN 'free-wifi'
        WHEN h ILIKE '%ar-condicionado%' OR h ILIKE '%climatizado%' THEN 'air-conditioning'
        WHEN h ILIKE '%ao vivo%' OR h ILIKE '%banda%' OR h ILIKE '%acústico%'
          OR h ILIKE '%samba%' OR h ILIKE '%trio%' OR h ILIKE '%forró%' THEN 'live-music'
        WHEN h ILIKE '%dj%' THEN 'dj-set'
        WHEN h ILIKE '%pista%' OR h ILIKE '%open%' OR h ILIKE '%camarote%' THEN 'lively-party'
        WHEN h ILIKE '%vista%' OR h ILIKE '%panor%' THEN 'scenic-view'
        WHEN h ILIKE '%jogo%' OR h ILIKE '%futebol%' THEN 'live-sports'
        WHEN h ILIKE '%telão%' OR h ILIKE '%projetor%' THEN 'big-screen-tvs'
        WHEN h ILIKE '%vegan%' THEN 'vegan-options'
        WHEN h ILIKE '%vegetarian%' THEN 'vegetarian-options'
        WHEN h ILIKE '%sem glúten%' OR h ILIKE '%sem lactose%' THEN 'gluten-free-lactose-free'
        WHEN h ILIKE '%drink%' OR h ILIKE '%coquete%' OR h ILIKE '%caipirinha%'
          OR h ILIKE '%autoral%' THEN 'signature-cocktails'
        WHEN h ILIKE '%artesanal%' OR h ILIKE '%cervejaria%' THEN 'craft-beer'
        WHEN h ILIKE '%happy hour%' THEN 'happy-hour'
        WHEN h ILIKE '%lgbt%' THEN 'lgbtq-friendly'
        WHEN h ILIKE '%reserva%' THEN 'accepts-reservations'
        WHEN h ILIKE '%vale-refei%' OR h ILIKE '%vr%' OR h ILIKE '%sodexo%'
          OR h ILIKE '%alelo%' THEN 'accepts-meal-voucher'
        WHEN h ILIKE '%balcão%' THEN 'counter-service'
        ELSE NULL
      END::public.establishment_attribute_enum AS attr
    FROM public.establishments est
    CROSS JOIN LATERAL UNNEST(est.highlights) AS h
  ) s
  GROUP BY s.id
) matched
WHERE e.id = matched.id;

ALTER TABLE public.establishments DROP COLUMN highlights;

-- Overlap (`&&`) é o operador do filtro; GIN é o índice que o atende.
CREATE INDEX establishments_attributes_idx
  ON public.establishments USING GIN (attributes);

-- A RPC de proximidade projeta as colunas do establishment: troca highlights
-- por attributes. Precisa de DROP porque o tipo de retorno muda.
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

-- O DROP acima descartou o GRANT da migration original; sem isto a RPC sai do
-- Data API e o "Perto de mim" quebra para anon/authenticated.
GRANT EXECUTE ON FUNCTION public.nearby_establishments(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;
