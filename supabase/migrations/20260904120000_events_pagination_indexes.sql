-- events.establishment_id e filtrado em toda listagem por bar
-- (listEventsByEstablishment, listOwnedEvents) e nao tinha indice: o Postgres
-- fazia seq scan. Com paginacao por cursor a query passa a rodar mais vezes,
-- em lotes menores, o que torna o indice mais relevante ainda.
CREATE INDEX IF NOT EXISTS events_establishment_id_idx
  ON public.events (establishment_id);

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
