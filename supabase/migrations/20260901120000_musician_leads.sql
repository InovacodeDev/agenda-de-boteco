-- Cadastro de músico vindo da landing page (issue #59).
--
-- É "lead", não "musician": o formulário coleta um contato para o time repassar
-- aos bares, não cria uma entidade de catálogo com perfil, slug e relações. A
-- tabela é uma caixa de entrada; a tela de consulta virá em issue própria.
--
-- POR QUE RPC E NÃO POLICY DE INSERT:
-- quem preenche o formulário é anônimo (a landing não tem login). Uma
-- `CREATE POLICY ... FOR INSERT WITH CHECK (true)` daria a qualquer portador da
-- anon key — que é pública por design — INSERT arbitrário na tabela: colunas
-- livres, sem limite de tamanho, sem validação. Mesma doutrina de
-- account_deletion_queue (20260617120000) e establishment_owners (20260812120000):
-- RLS habilitada + ZERO policy = acesso direto negado por padrão, e a única
-- porta de escrita é a função SECURITY DEFINER abaixo, que só aceita os campos
-- do formulário, cada um dentro de um teto explícito.

CREATE TABLE public.musician_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  -- Texto livre, não FK para cities: a landing não tem o combobox de cidade do
  -- painel, e o músico costuma atender uma faixa ("Grande Florianópolis",
  -- "Norte da ilha") que não é uma cidade única do catálogo.
  region TEXT NOT NULL,
  -- Array, não coluna única: músico raramente toca um estilo só. Espelha
  -- events.music_style_ids; os ids são validados contra music_styles na RPC.
  music_style_ids TEXT[] NOT NULL,
  instagram TEXT NOT NULL,
  -- Opcional e texto livre. price_range_enum ('$'..'$$$$') modela gasto por
  -- pessoa no bar, semântica diferente de cachê de show — reusá-lo aqui seria
  -- forçar um significado que o enum não tem.
  price_range TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.musician_leads ENABLE ROW LEVEL SECURITY;

-- Leitura só de admin. is_admin() (20260629120000) é SECURITY DEFINER, então
-- não recursa RLS em profiles. Não há policy de INSERT/UPDATE/DELETE: ver o
-- cabeçalho. O dado é de contato de terceiro (PII) — nada de USING (true) aqui.
CREATE POLICY admin_select_musician_leads ON public.musician_leads
  FOR SELECT USING (public.is_admin());

-- Triagem da caixa de entrada é por ordem de chegada.
CREATE INDEX musician_leads_created_at_idx ON public.musician_leads (created_at DESC);

-- Registra o cadastro do músico. SECURITY DEFINER porque o chamador é anônimo e
-- não tem INSERT na tabela; a função é a única porta, e valida tudo aqui — o
-- cliente é adulterável, então o Zod do formulário é UX e este bloco é a regra.
--
-- Tetos anti-abuso (§6): cada campo tem comprimento máximo explícito e o array
-- de estilos tem cardinalidade máxima. Sem eles, um POST direto na RPC gravaria
-- megabytes por linha. Rate limiting continua sendo do Supabase.
CREATE OR REPLACE FUNCTION public.create_musician_lead(
  p_name TEXT,
  p_phone TEXT,
  p_region TEXT,
  p_music_style_ids TEXT[],
  p_instagram TEXT,
  p_price_range TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_phone TEXT := btrim(COALESCE(p_phone, ''));
  v_region TEXT := btrim(COALESCE(p_region, ''));
  -- Normaliza o handle para a forma sem '@', igual a establishments.instagram
  -- (buildInstagramProfileUrl no core espera o username puro).
  v_instagram TEXT := btrim(regexp_replace(COALESCE(p_instagram, ''), '^@+', ''));
  v_price_range TEXT := NULLIF(btrim(COALESCE(p_price_range, '')), '');
  v_styles TEXT[];
  v_id UUID;
BEGIN
  IF v_name = '' OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Nome é obrigatório e deve ter até 120 caracteres'
      USING ERRCODE = '22023';
  END IF;

  -- 10 dígitos (fixo) ou 11 (celular), o que maskPhoneBR produz. A checagem é
  -- sobre os dígitos, então aceita o valor mascarado ou cru.
  IF regexp_replace(v_phone, '\D', '', 'g') !~ '^\d{10,11}$' THEN
    RAISE EXCEPTION 'Telefone deve ter DDD e 8 ou 9 dígitos' USING ERRCODE = '22023';
  END IF;

  IF v_region = '' OR length(v_region) > 120 THEN
    RAISE EXCEPTION 'Região é obrigatória e deve ter até 120 caracteres'
      USING ERRCODE = '22023';
  END IF;

  -- Instagram: só o alfabeto que a plataforma aceita, para o handle não virar
  -- um path arbitrário quando o admin montar o link do perfil.
  IF v_instagram !~ '^[A-Za-z0-9._]{1,30}$' THEN
    RAISE EXCEPTION 'Instagram deve ter até 30 caracteres (letras, números, ponto ou _)'
      USING ERRCODE = '22023';
  END IF;

  IF v_price_range IS NOT NULL AND length(v_price_range) > 60 THEN
    RAISE EXCEPTION 'Faixa de valor deve ter até 60 caracteres' USING ERRCODE = '22023';
  END IF;

  -- Deduplica e descarta vazios antes de conferir contra o catálogo.
  SELECT COALESCE(array_agg(DISTINCT s), ARRAY[]::TEXT[])
    INTO v_styles
    FROM unnest(COALESCE(p_music_style_ids, ARRAY[]::TEXT[])) AS s
   WHERE btrim(s) <> '';

  IF array_length(v_styles, 1) IS NULL THEN
    RAISE EXCEPTION 'Escolha ao menos um estilo musical' USING ERRCODE = '22023';
  END IF;

  -- Teto de cardinalidade: hoje o catálogo tem 10 estilos, mas o limite não
  -- depende disso — é o que impede um array gigante de ids repetidos válidos.
  IF array_length(v_styles, 1) > 10 THEN
    RAISE EXCEPTION 'Escolha no máximo 10 estilos musicais' USING ERRCODE = '22023';
  END IF;

  -- Estilo fora do catálogo é entrada inválida, não estilo novo: a tabela
  -- music_styles é curada pelo admin.
  IF EXISTS (
    SELECT 1
      FROM unnest(v_styles) AS s
     WHERE NOT EXISTS (SELECT 1 FROM public.music_styles ms WHERE ms.id = s)
  ) THEN
    RAISE EXCEPTION 'Estilo musical inválido' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.musician_leads (
    name, phone, region, music_style_ids, instagram, price_range
  ) VALUES (
    v_name, v_phone, v_region, v_styles, v_instagram, v_price_range
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.create_musician_lead(TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) FROM PUBLIC;
-- anon: a landing é pública e o músico não tem conta. authenticated entra junto
-- porque um usuário logado do app também pode se cadastrar como músico.
GRANT EXECUTE ON FUNCTION public.create_musician_lead(TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO anon, authenticated, service_role;
