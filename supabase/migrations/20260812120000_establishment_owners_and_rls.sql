-- Painel do estabelecimento (Fase 1): vínculo conta ↔ bar e isolamento por RLS.
-- Análogo ao 20260629120000_admin_profiles_and_write_rls, mas para donos de bar:
-- lá a autorização é global (profiles.is_admin), aqui é por linha (qual bar é seu).

-- 1) Vínculo user ↔ establishment. establishments.id é TEXT (20260611185705),
-- então establishment_id acompanha o tipo.
CREATE TABLE public.establishment_owners (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id TEXT NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, establishment_id)
);

ALTER TABLE public.establishment_owners ENABLE ROW LEVEL SECURITY;

-- Cada um lê só o próprio vínculo. Não há policy de INSERT/UPDATE/DELETE de
-- propósito: com uma, qualquer usuário autenticado se declararia dono de
-- qualquer bar. O vínculo só nasce via create_owned_establishment()
-- (SECURITY DEFINER, abaixo) ou service_role/SQL direto.
CREATE POLICY select_own_establishment_owner ON public.establishment_owners
  FOR SELECT USING (auth.uid() = user_id);

-- Busca reversa "quem são os donos deste bar" (usada por admin/service_role).
CREATE INDEX establishment_owners_establishment_id_idx
  ON public.establishment_owners (establishment_id);

-- 2) owns_establishment(): espelha is_admin(). SECURITY DEFINER para ler o
-- vínculo sem recursão de RLS; STABLE para o planner avaliar 1x por query.
CREATE OR REPLACE FUNCTION public.owns_establishment(target_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_owners
    WHERE user_id = auth.uid()
      AND establishment_id = target_id
  );
$$;

-- 3) Escrita do dono, restrita às linhas do próprio bar. As policies de admin
-- de 20260629120000 continuam valendo: policies permissivas são OR entre si.

-- O dono edita o próprio bar, mas não cria nem apaga estabelecimento (é do admin).
-- WITH CHECK no id impede repontar a linha para outro estabelecimento.
CREATE POLICY owner_update_establishments ON public.establishments
  FOR UPDATE
  USING (public.owns_establishment(id))
  WITH CHECK (public.owns_establishment(id));

-- events.establishment_id é a FK para o bar (20260611185705).
CREATE POLICY owner_insert_events ON public.events
  FOR INSERT WITH CHECK (public.owns_establishment(establishment_id));

CREATE POLICY owner_update_events ON public.events
  FOR UPDATE
  USING (public.owns_establishment(establishment_id))
  WITH CHECK (public.owns_establishment(establishment_id));

CREATE POLICY owner_delete_events ON public.events
  FOR DELETE USING (public.owns_establishment(establishment_id));

-- 4) Onboarding: cria bar + vínculo atomicamente. Precisa ser SECURITY DEFINER
-- porque o usuário não tem INSERT em establishments nem em establishment_owners
-- — é justamente esta função que concede o direito, uma única vez.
--
-- Só passamos os campos do wizard (nome, cidade, endereço, bairro, whatsapp).
-- As demais colunas NOT NULL de establishments não têm default, então recebem
-- placeholders aqui e são preenchidas depois pela tela de Perfil (Fase 2):
--   description, logo_url, cover_url, opening_hours, ambiance → ''
--   lat, lng → 0 (o trigger de location geocodifica a partir daí; 0/0 fica
--     fora de qualquer raio de busca, então o bar não aparece no "perto de mim"
--     até ter coordenada real — preferível a aparecer no lugar errado)
--   price_range → '$$'
-- slug é gerado pelo trigger trg_set_slug_establishments.
CREATE OR REPLACE FUNCTION public.create_owned_establishment(
  p_name TEXT,
  p_city_id TEXT,
  p_address TEXT,
  p_neighborhood TEXT,
  p_whatsapp TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  -- Um dono = um bar nesta fase.
  IF EXISTS (SELECT 1 FROM public.establishment_owners WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Usuário já é dono de um estabelecimento' USING ERRCODE = '23505';
  END IF;

  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Nome do estabelecimento é obrigatório' USING ERRCODE = '22023';
  END IF;

  -- id TEXT segue o padrão do catálogo (slug do nome); gen_random_uuid como
  -- sufixo garante unicidade sem loop de retry.
  v_id := left(
    COALESCE(NULLIF(public.slugify(p_name), ''), 'bar') || '-' ||
    replace(gen_random_uuid()::text, '-', ''),
    120
  );

  INSERT INTO public.establishments (
    id, name, description, logo_url, cover_url, address, neighborhood,
    city_id, lat, lng, whatsapp, opening_hours, price_range, ambiance
  ) VALUES (
    v_id, p_name, '', '', '', p_address, p_neighborhood,
    p_city_id, 0, 0, p_whatsapp, '', '$$', ''
  );

  INSERT INTO public.establishment_owners (user_id, establishment_id)
  VALUES (v_user_id, v_id);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_owned_establishment(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owned_establishment(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
