-- Painel do dono, ajustes de onboarding:
--
-- 1. Faixa de preço passa a ser opcional ("Não definido"). Antes o vazio caía
--    em '$$', o que publicava uma faixa que o dono nunca informou.
-- 2. Dono de bar pode subir arquivos no bucket catalog-images (logo, capa e o
--    cardápio em PDF ou imagem). Até aqui só admin tinha INSERT, então o upload
--    do painel falhava na RLS do storage.

ALTER TABLE public.establishments ALTER COLUMN price_range DROP NOT NULL;

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
AS $fn$
DECLARE
  v_user_id UUID := auth.uid();
  v_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

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

  INSERT INTO public.establishments (
    id, name, description, logo_url, cover_url, address, neighborhood,
    city_id, lat, lng, whatsapp, instagram, opening_hours, price_range,
    ambiance, menu_pdf_url, attributes
  ) VALUES (
    v_id, p_name, COALESCE(p_description, ''), COALESCE(p_logo_url, ''),
    COALESCE(p_cover_url, ''), p_address, p_neighborhood,
    p_city_id, 0, 0, p_whatsapp, NULLIF(btrim(COALESCE(p_instagram, '')), ''),
    COALESCE(p_opening_hours, ''),
    NULLIF(btrim(COALESCE(p_price_range, '')), '')::public.price_range_enum,
    COALESCE(p_ambiance, ''),
    NULLIF(btrim(COALESCE(p_menu_url, '')), ''),
    COALESCE(p_attributes, '{}')
  );

  INSERT INTO public.establishment_owners (user_id, establishment_id)
  VALUES (v_user_id, v_id);

  RETURN v_id;
END;
$fn$;

-- Dono sobe só na pasta establishments/ e só extensões da allowlist do
-- services/storage.ts: o bucket é público, e um .html servido dali seria XSS
-- no domínio do storage. O nome do arquivo é gerado no cliente (uuid + ext).
CREATE POLICY catalog_images_owner_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'catalog-images'
    AND public.is_establishment_owner()
    AND (storage.foldername(name))[1] = 'establishments'
    AND lower(storage.extension(name)) IN ('jpg', 'png', 'webp', 'gif', 'avif', 'heic', 'pdf')
  );

-- Troca de logo/capa/cardápio apaga o arquivo anterior; o dono só apaga o que
-- ele mesmo subiu.
CREATE POLICY catalog_images_owner_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'catalog-images'
    AND public.is_establishment_owner()
    AND owner = auth.uid()
  );
