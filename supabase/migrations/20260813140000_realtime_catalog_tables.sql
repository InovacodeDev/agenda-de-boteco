-- Completa a publication `supabase_realtime` com as tabelas de catálogo que a
-- UI consulta mas que ficaram de fora de 20260612000200: cities e music_styles
-- alimentam filtros/combobox, event_attractions alimenta o detalhe do evento.
-- Sem elas, uma alteração no admin/painel só aparecia no refetch seguinte.
--
-- REPLICA IDENTITY FULL: sem ela o payload de DELETE traz apenas a PK. Como a
-- invalidação aqui é por prefixo de query key, a PK bastaria hoje — mas manter
-- as tabelas do catálogo uniformes evita a pegadinha silenciosa quando algum
-- handler futuro precisar ler `payload.old`.
ALTER TABLE public.cities REPLICA IDENTITY FULL;
ALTER TABLE public.music_styles REPLICA IDENTITY FULL;
ALTER TABLE public.event_attractions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_styles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attractions;
