-- O onboarding passou a coletar, nos três passos, tudo que antes ficava como
-- placeholder vazio para a tela de Perfil: identidade (logo, capa, descrição),
-- contato (Instagram) e operação (horário, faixa de preço, ambiente, cardápio e
-- os diferenciais).
--
-- A assinatura muda (5 → 14 parâmetros), e mudar a lista de argumentos de uma
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
  p_whatsapp TEXT,
  p_instagram TEXT,
  p_opening_hours TEXT,
  p_price_range TEXT,
  p_ambiance TEXT,
  p_menu_url TEXT,
  p_attributes public.establishment_attribute_enum[]
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

  -- Faixa de preço é opcional no formulário; vazio cai no '$$' (moderado).
  -- lat/lng seguem 0/0 até o Perfil informar o endereço geocodificado — 0/0
  -- fica fora de qualquer raio de busca, então o bar não aparece no "perto de
  -- mim" no lugar errado.
  INSERT INTO public.establishments (
    id, name, description, logo_url, cover_url, address, neighborhood,
    city_id, lat, lng, whatsapp, instagram, opening_hours, price_range,
    ambiance, menu_pdf_url, attributes
  ) VALUES (
    v_id, p_name, COALESCE(p_description, ''), COALESCE(p_logo_url, ''),
    COALESCE(p_cover_url, ''), p_address, p_neighborhood,
    p_city_id, 0, 0, p_whatsapp, NULLIF(btrim(COALESCE(p_instagram, '')), ''),
    COALESCE(p_opening_hours, ''),
    COALESCE(NULLIF(btrim(COALESCE(p_price_range, '')), ''), '$$')::public.price_range_enum,
    COALESCE(p_ambiance, ''),
    NULLIF(btrim(COALESCE(p_menu_url, '')), ''),
    COALESCE(p_attributes, '{}')
  );

  INSERT INTO public.establishment_owners (user_id, establishment_id)
  VALUES (v_user_id, v_id);

  RETURN v_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.create_owned_establishment(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.establishment_attribute_enum[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_owned_establishment(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  public.establishment_attribute_enum[]
) TO authenticated, service_role;
