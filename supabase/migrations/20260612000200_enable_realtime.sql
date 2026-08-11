-- Habilita realtime (postgres_changes) para events, establishments e
-- notifications. Statements separados: ALTER PUBLICATION não aceita lista de
-- tabelas em todas as versões.
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.establishments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
