-- Bucket público para imagens do catálogo (logos, capas, banners, fotos de
-- evento). Até aqui as imagens eram URLs externas digitadas no admin; agora o
-- admin faz upload de arquivo e grava a URL pública resultante.
--
-- Público: leitura livre (as URLs são públicas e os schemas exigem .url()).
-- Escrita restrita a admins, reusando public.is_admin() da migration de RLS.

INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-images', 'catalog-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública das imagens do bucket.
CREATE POLICY catalog_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'catalog-images');

-- Escrita (upload/atualização/remoção) só para admins.
CREATE POLICY catalog_images_admin_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'catalog-images' AND public.is_admin());

CREATE POLICY catalog_images_admin_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'catalog-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'catalog-images' AND public.is_admin());

CREATE POLICY catalog_images_admin_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'catalog-images' AND public.is_admin());
