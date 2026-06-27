-- #4 fotos: banner_url segue sendo o destaque (feed); photo_urls = fotos extras do carrossel
ALTER TABLE public.events
  ADD COLUMN photo_urls TEXT[] NOT NULL DEFAULT '{}'::text[];

-- #6 atrações secundárias: attraction (string) segue como headliner; tabela SÓ p/ secundárias
CREATE TABLE public.event_attractions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX event_attractions_event_idx ON public.event_attractions(event_id);

ALTER TABLE public.event_attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_event_attractions
  ON public.event_attractions FOR SELECT USING (true);
