-- Slugs (events, establishments, cities) + RPC de proximidade nearby_establishments.

-- ---------------------------------------------------------------------------
-- slugify: lowercase, remove acentos (sem extensão unaccent), troca
-- não-alfanumérico por hífen, colapsa hífens e remove hífens das pontas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(input),
          'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
          'aaaaaaeeeeiiiiooooouuuucnyy'
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    ),
    '-'
  );
$$;

ALTER TABLE public.events ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE public.establishments ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE public.cities ADD COLUMN slug TEXT UNIQUE;

-- Gera slug a partir de name quando slug IS NULL; em caso de colisão na
-- própria tabela (excluindo o próprio id), aplica sufixo -{id}.
CREATE OR REPLACE FUNCTION public.set_slug_from_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base_slug text;
  has_collision boolean;
BEGIN
  IF NEW.slug IS NULL THEN
    base_slug := public.slugify(NEW.name);
    -- Nome sem alfanuméricos ASCII (ex.: '!!!') geraria slug vazio e, em
    -- colisão, '-{id}' com hífen inicial: cai para o próprio id.
    IF base_slug = '' THEN
      base_slug := NEW.id;
    END IF;
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE slug = $1 AND id <> $2)',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME
    )
    INTO has_collision
    USING base_slug, NEW.id;
    IF has_collision THEN
      NEW.slug := base_slug || '-' || NEW.id;
    ELSE
      NEW.slug := base_slug;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_slug_events
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_slug_from_name();

CREATE TRIGGER trg_set_slug_establishments
BEFORE INSERT OR UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.set_slug_from_name();

CREATE TRIGGER trg_set_slug_cities
BEFORE INSERT OR UPDATE ON public.cities
FOR EACH ROW
EXECUTE FUNCTION public.set_slug_from_name();

-- ---------------------------------------------------------------------------
-- nearby_establishments: estabelecimentos num raio (km) de um ponto de origem,
-- ordenados por distância. Params prefixados com origin_* para não colidir com
-- as colunas lat/lng do RETURNS TABLE.
--
-- ATENÇÃO: a lista de colunas do RETURNS TABLE espelha public.establishments
-- na ordem da tabela (+ distance_km ao final). Qualquer mudança nas colunas de
-- public.establishments precisa ser refletida aqui.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nearby_establishments(
  origin_lat double precision,
  origin_lng double precision,
  radius_km double precision DEFAULT 50,
  max_results integer DEFAULT 50
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
  highlights text[],
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
    e.highlights,
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

-- Garante que a RPC fica acessível via Data API (novas funções não são
-- auto-expostas por padrão).
GRANT EXECUTE ON FUNCTION public.nearby_establishments(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;
