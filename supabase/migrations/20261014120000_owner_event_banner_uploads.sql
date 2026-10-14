-- Banner de evento é enviado pelo painel do dono para catalog-images/events/
-- (web-client e mobile-client), mas catalog_images_owner_insert só liberava
-- establishments/ — o upload do banner falhava na RLS do storage.
--
-- Mesma régua da policy original: só dono de bar, nome gerado no cliente
-- (uuid + ext) e allowlist de extensão. Em events/ só imagem: banner nunca é PDF.
DROP POLICY IF EXISTS catalog_images_owner_insert ON storage.objects;

CREATE POLICY catalog_images_owner_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'catalog-images'
    AND public.is_establishment_owner()
    AND (
      (
        (storage.foldername(name))[1] = 'establishments'
        AND lower(storage.extension(name)) IN ('jpg', 'png', 'webp', 'gif', 'avif', 'heic', 'pdf')
      )
      OR (
        (storage.foldername(name))[1] = 'events'
        AND lower(storage.extension(name)) IN ('jpg', 'png', 'webp', 'gif', 'avif', 'heic')
      )
    )
  );
