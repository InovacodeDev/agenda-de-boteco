-- Onboarding passo 1 passou a coletar logo, capa e descrição, que antes eram
-- placeholders vazios preenchidos só depois na tela de Perfil.
--
-- A assinatura muda (5 → 8 parâmetros), e mudar a lista de argumentos de uma
-- função exige DROP: CREATE OR REPLACE só substitui a de assinatura idêntica —
-- sem o DROP, as duas versões coexistiriam e a chamada ficaria ambígua.
DROP FUNCTION IF EXISTS public.create_owned_establishment(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_owned_establishment(
  p_name TEXT,
  p_description TEXT,
  p_logo_url TEXT,
  p_cover_url TEXT,
  p_city_id TEXT,
  p_address TEXT,
  p_neighborhood TEXT,
  p_whatsapp TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Delimitador nomeado: o corpo contém '$$' (a faixa de preço padrão), que
-- fecharia um dollar-quote anônimo no meio da função.
AS $fn$
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

  v_id := left(
    COALESCE(NULLIF(public.slugify(p_name), ''), 'bar') || '-' ||
    replace(gen_random_uuid()::text, '-', ''),
    120
  );

  -- opening_hours, ambiance, lat/lng e price_range seguem como placeholders:
  -- são do passo de Perfil (Fase 2), não do onboarding.
  INSERT INTO public.establishments (
    id, name, description, logo_url, cover_url, address, neighborhood,
    city_id, lat, lng, whatsapp, opening_hours, price_range, ambiance
  ) VALUES (
    v_id, p_name, COALESCE(p_description, ''), COALESCE(p_logo_url, ''),
    COALESCE(p_cover_url, ''), p_address, p_neighborhood,
    p_city_id, 0, 0, p_whatsapp, '', '$$', ''
  );

  INSERT INTO public.establishment_owners (user_id, establishment_id)
  VALUES (v_user_id, v_id);

  RETURN v_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.create_owned_establishment(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_owned_establishment(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
