-- events_establishment_id_idx sozinho nao serve a query paginada por bar
-- (filtra establishment_id, ordena starts_at+id); indice composto cobre as
-- duas coisas numa unica varredura (listEventsByEstablishment, listOwnedEvents).
CREATE INDEX IF NOT EXISTS events_establishment_id_starts_at_id_idx
  ON public.events (establishment_id, starts_at, id);

-- O cursor de eventos ordena por (starts_at, id): indice composto cobre a
-- ordenacao e o filtro de continuacao numa unica varredura.
CREATE INDEX IF NOT EXISTS events_starts_at_id_idx
  ON public.events (starts_at, id);

-- Cursor de estabelecimentos ordena por (name, id).
CREATE INDEX IF NOT EXISTS establishments_name_id_idx
  ON public.establishments (name, id);

-- Cursor de avisos ordena por (created_at desc, id desc).
CREATE INDEX IF NOT EXISTS notifications_created_at_id_idx
  ON public.notifications (created_at DESC, id DESC);
