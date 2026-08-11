-- Link do post/reel do Instagram que divulga o evento (opcional).
-- O @ exibido no detalhe do evento é o do estabelecimento; esta coluna guarda
-- para onde o toque leva quando o evento tem post próprio.
ALTER TABLE public.events
ADD COLUMN instagram_post_url TEXT;
