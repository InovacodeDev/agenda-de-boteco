-- O onboarding passou a permitir que o dono cadastre uma cidade que ainda não
-- está no catálogo. Escrita em `cities` é admin-only (20260629120000), então a
-- criação vai por RPC SECURITY DEFINER em vez de uma policy de INSERT: assim a
-- tabela do catálogo não fica aberta a escrita livre e a checagem de duplicata
-- acontece do lado do banco, onde não dá para contornar.
--
-- Deduplicação por slugify(nome)+uf: "São Paulo", "sao paulo" e "SÃO  PAULO"
-- convergem para o mesmo slug, então um typo de acento/caixa reaproveita a
-- cidade existente em vez de criar uma segunda. Se já existir, devolve o id
-- dela — a função é idempotente, e chamar de novo nunca duplica.
--
-- lat/lng nascem 0: o dono informa só nome e UF. Zero fica fora de qualquer
-- raio de busca, então a cidade não puxa bares para o lugar errado no "perto de
-- mim" até o admin preencher a coordenada real.
CREATE OR REPLACE FUNCTION public.create_city_from_panel(
  p_name TEXT,
  p_uf TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_uf TEXT := upper(btrim(COALESCE(p_uf, '')));
  v_slug TEXT;
  v_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Nome da cidade é obrigatório' USING ERRCODE = '22023';
  END IF;

  IF v_uf !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'UF inválida' USING ERRCODE = '22023';
  END IF;

  v_slug := public.slugify(v_name);
  IF v_slug = '' THEN
    RAISE EXCEPTION 'Nome da cidade é inválido' USING ERRCODE = '22023';
  END IF;

  -- Já existe (mesmo nome normalizado, mesma UF)? Reaproveita.
  SELECT id INTO v_id
  FROM public.cities
  WHERE public.slugify(name) = v_slug AND upper(uf) = v_uf
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- id segue o padrão do catálogo: slug do nome, sufixado pela UF para que
  -- homônimos em estados diferentes (ex.: Campo Grande) convivam.
  v_id := left(v_slug || '-' || lower(v_uf), 60);

  INSERT INTO public.cities (id, name, uf, lat, lng)
  VALUES (v_id, v_name, v_uf, 0, 0)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.create_city_from_panel(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_city_from_panel(TEXT, TEXT) TO authenticated, service_role;
