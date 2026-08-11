CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE public.price_range_enum AS ENUM ('$', '$$', '$$$', '$$$$');
CREATE TYPE public.notification_type_enum AS ENUM ('style', 'city', 'favorite', 'promo');

CREATE TABLE public.music_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL
);

CREATE TABLE public.cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  uf CHAR(2) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL
);

CREATE TABLE public.establishments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location geography(Point, 4326),
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  opening_hours TEXT NOT NULL,
  menu_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_range public.price_range_enum NOT NULL,
  ambiance TEXT NOT NULL,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (rating_avg >= 0.0 AND rating_avg <= 5.0),
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  highlights TEXT[] NOT NULL DEFAULT '{}'::text[]
);

CREATE OR REPLACE FUNCTION public.update_establishment_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_Point(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_establishment_location
BEFORE INSERT OR UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.update_establishment_location();

CREATE INDEX establishments_location_idx ON public.establishments USING GIST (location);

CREATE TABLE public.events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  attraction TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  music_style_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  establishment_id TEXT NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  cover_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.0 CHECK (cover_charge >= 0.0),
  courtesy TEXT,
  promo TEXT
);

CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type public.notification_type_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  establishment_id TEXT REFERENCES public.establishments(id) ON DELETE SET NULL
);

ALTER TABLE public.music_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_music_styles ON public.music_styles FOR SELECT USING (true);
CREATE POLICY select_cities ON public.cities FOR SELECT USING (true);
CREATE POLICY select_establishments ON public.establishments FOR SELECT USING (true);
CREATE POLICY select_events ON public.events FOR SELECT USING (true);
CREATE POLICY select_notifications ON public.notifications FOR SELECT USING (true);
