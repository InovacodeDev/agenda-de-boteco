-- unaccent: nenhuma extensão de normalização de texto existe hoje no projeto
-- (grep confirmou ausência de pg_trgm/unaccent). Necessária para a busca por
-- nome/região não depender do usuário digitar o acento exato.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- RPC em vez de policy de SELECT: expõe só os campos de leitura necessários ao
-- painel do dono, sem abrir a tabela inteira (musician_leads é PII de terceiro:
-- telefone e instagram de contato). Qualquer authenticated pode chamar — leads
-- de músico não pertencem a um estabelecimento específico.
-- Paginação por cursor composto (campo_de_ordenação, id) em vez de OFFSET:
-- estável sob inserção concorrente enquanto o owner rola a lista (infinite
-- scroll). O cursor muda de campo conforme p_sort, por isso os três pares de
-- parâmetros de cursor (created_at/name/region) — só o par correspondente ao
-- p_sort ativo é usado a cada chamada.
CREATE OR REPLACE FUNCTION public.list_musician_leads(
  p_search TEXT DEFAULT NULL,
  p_music_style_id TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'recent', -- 'recent' | 'name' | 'region'
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_name TEXT DEFAULT NULL,
  p_cursor_region TEXT DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 40
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  region TEXT,
  music_style_ids TEXT[],
  instagram TEXT,
  price_range TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name, phone, region, music_style_ids, instagram, price_range, created_at
  FROM public.musician_leads
  WHERE auth.uid() IS NOT NULL
    AND (
      p_search IS NULL
      OR extensions.unaccent(name) ILIKE extensions.unaccent('%' || p_search || '%')
    )
    AND (p_music_style_id IS NULL OR p_music_style_id = ANY(music_style_ids))
    AND (
      p_region IS NULL
      OR extensions.unaccent(region) ILIKE extensions.unaccent('%' || p_region || '%')
    )
    AND (
      CASE p_sort
        WHEN 'name' THEN
          p_cursor_name IS NULL OR (name, id) > (p_cursor_name, p_cursor_id)
        WHEN 'region' THEN
          p_cursor_region IS NULL OR (region, id) > (p_cursor_region, p_cursor_id)
        ELSE
          p_cursor_created_at IS NULL OR (created_at, id) < (p_cursor_created_at, p_cursor_id)
      END
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN name END ASC,
    CASE WHEN p_sort = 'region' THEN region END ASC,
    CASE WHEN p_sort = 'recent' OR p_sort IS NULL THEN created_at END DESC,
    id ASC
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.list_musician_leads(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, INTEGER
) TO authenticated;
