-- GRANT explícito nas tabelas do schema public. `auto_expose_new_tables`
-- (comportamento legado que auto-concedia isso) está sendo descontinuado
-- pelo Supabase CLI — sem GRANT a RLS nunca chega a ser avaliada, a role
-- recebe 42501 antes disso. Cada GRANT abaixo espelha exatamente as
-- operações que a policy da tabela já autoriza; RLS continua sendo a
-- autorização real.

-- Catálogo público: SELECT para anon e authenticated; INSERT/UPDATE/DELETE
-- admin-only (policies admin_insert_%/admin_update_%/admin_delete_% de
-- 20260629120000) e escrita de dono de bar (owns_establishment(), 20260812120000)
-- são ambas restritas por RLS, então o GRANT de escrita cobre as duas.
GRANT SELECT ON public.music_styles, public.cities, public.establishments,
  public.events, public.notifications, public.event_attractions
  TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.establishments, public.events,
  public.notifications, public.event_attractions, public.music_styles, public.cities
  TO authenticated;

-- Perfil próprio, só leitura (sem policy de UPDATE — is_admin não é editável via API).
GRANT SELECT ON public.profiles TO authenticated;

-- Favoritos: dono do registro lê/insere/remove (20260615120000).
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;

-- Vínculo dono↔bar: só leitura direta; escrita é via RPC SECURITY DEFINER.
GRANT SELECT ON public.establishment_owners TO authenticated;

-- Moderação: dono insere, dono/admin leem, admin atualiza (20260813120000).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_terms TO authenticated;

-- account_deletion_queue e musician_leads não têm policy de acesso direto: a
-- única porta de escrita é RPC SECURITY DEFINER, que roda como owner da
-- função e não precisa de GRANT na tabela.
--
-- establishment_metrics é diferente: escrita é só via RPC SECURITY DEFINER,
-- mas leitura tem policy própria (owner_select_establishment_metrics,
-- 20260902130000) — corrigido em 20260902213000_grant_establishment_metrics_select.sql.
